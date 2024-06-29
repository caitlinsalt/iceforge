// Use marked.js for rendering markdown pages, together with...
//
// - HLJS and marked-highlight for code highlighting
// - marked-smartypants for smart quotes and other punctuation
// - marked-gfm-heading-id to enable anchor links and (if you want it) TOC rendering.
// - js-yaml for frontmatter parsing
//
// This code also overrides marked.js's default rendering of <a> and <img> tags so that
// relative URLs are rewritten to work correctly when the content of a Markdown page is
// embedded in a path different to the page's canonical path.

import fs from 'node:fs/promises';

import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import { mangle as markedMangle } from 'marked-mangle';
import { markedSmartypants } from 'marked-smartypants';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import hljs from 'highlight.js';
import yaml from 'js-yaml';

import ContentTree from '../core/contentTree.js';
import ContentPlugin from '../core/contentPlugin.js';
import { Page } from './page.js';
import { IContentTree, FilePath, IEnvironment, Indexable } from '../core/coreTypes.js';
import { readJson, urlResolve } from '../core/utils.js';

// This is a slightly fishy absolute URI test: it selects anything that looks like it could start with a scheme.
const isAbsoluteUri = (url: string): boolean => {
    return !!(url.match(/^[a-zA-Z.+]+:/));
};

// Rewrite a URL target if it is relative
const resolveLink = (content: ContentPlugin, uri: string, baseUri: string): string => {

    if (isAbsoluteUri(uri)) {
        // Absolute URI - trust the user.
        return uri;
    }

    if (uri.startsWith('#')) {
        // Internal anchor
        return uri;
    }

    let pathname = uri;
    let hashPart = '';
    if (pathname.includes('#')) {
        const hashPos = pathname.indexOf('#');
        hashPart = pathname.substring(hashPos);
        pathname = pathname.substring(0, hashPos);
    }
    if (pathname.includes('?')) {
        const qPos = pathname.indexOf('?');
        pathname = pathname.substring(0, qPos);
    }

    let nav: (IContentTree | ContentPlugin) = content.parent;
    const path = pathname ? pathname.split('/') : [];
    while (path.length && nav) {
        const part = path.shift();
        if (part === '') {
            // URI begins with / - go to content root
            while (nav.parent) {
                nav = nav.parent;
            }
        }
        else if (part === '..') {
            nav = nav.parent;
        } else if (nav instanceof ContentTree && ((nav as IContentTree)[part] instanceof ContentTree || (nav as IContentTree)[part] instanceof ContentPlugin)) {
            nav = (nav as IContentTree)[part] as (IContentTree | ContentPlugin);
        }
    }
    if (nav && nav instanceof ContentPlugin) {
        return nav.url + hashPart;
    }
    return urlResolve(baseUri, uri);
};

// Simplified versions of Marked's actual types.
type MarkedRendererExtension = {
    link: (href: string, title:string, text:string) => string;
    image: (href: string, title:string, text:string) => string;
}

type MarkedExtension = {
    highlight: (code: string, lang: string) => string;
    renderer: MarkedRendererExtension;
}

const highlighter = (code: string, lang: string): string => {
    try {
        if (lang === 'auto') {
            return hljs.highlightAuto(code).value;
        } else if (hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        } else {
            return code;
        }
    } catch {
        return code;
    }
};

// The link renderer function is essentially copied from the Marked.js source code, but with the link rewritten before rendering.
export const linkRenderer = (content: ContentPlugin, baseUrl: string, href: string, title: string, text: string): string => {
    href = resolveLink(content, href, baseUrl);
    if (href === null) {
        return text;
    }
    let out = `<a href="${href}"`;
    if (title) {
        out += ` title="${title}"`;
    }
    out += `>${text}</a>`;
    return out;
};

// The image renderer function is essentially copied from the Marked.js source code, but with the link rewritten before rendering.
export const imageRenderer = (content: ContentPlugin, baseUrl: string, href: string, title: string, text: string): string => {
    href = resolveLink(content, href, baseUrl);
    if (href === null) {
        return text;
    }
    let out = `<img src="${href}" alt="${text}"`;
    if (title) {
        out += ` title="${title}"`;
    }
    out += '/>';
    return out;
};

// Set up a Marked instance with our own configuration and extensions, and render the page.
const parseMarkdown = (content: ContentPlugin, markdown: string, baseUrl: string, options: MarkedExtension) => {
    options.renderer = {
        link: (href: string, title: string, text: string): string => linkRenderer(content, baseUrl, href, title, text),
        image: (href: string, title: string, text: string): string => imageRenderer(content, baseUrl, href, title, text)
    };

    const highlightRoutine = markedHighlight({
        langPrefix: 'hljs language-',
        highlight: highlighter
    });

    const headingIdOptions = { prefix: 'iceforge-' };

    const marked = new Marked(
        options, 
        highlightRoutine, 
        markedMangle(), 
        markedSmartypants(), 
        gfmHeadingId(headingIdOptions)
    );
    return marked.parse(markdown);
};

// Take the frontmatter part of the page, and parse it as YAML.
const extractMetadata = async (yamlSource: string) => {
    
    if (!yamlSource) {
        return {};
    }

    try {
        return (await yaml.load(yamlSource) || {}) as Indexable;
    } catch (error) {
        if (error.problem && error.problemMark) {
            const lines = error.problemMark.buffer.split('\n');
            const markerPad = ' '.repeat(error.problemMark.column);
            error.message = `YAML: ${error.problem}
              ${lines[error.problemMark.line]}
              ${markerPad}^

`;
        } else {
            error.message = `YAML parsing error: ${error.message}`;
        }
        throw error;
    }
};


type preparsedSource = {
    markdown: string;
    yamlSource: string;
};

// Split a page into the YAML frontmatter and the Markdown content.
const splitContent = (content: string): preparsedSource => {

    if (content.startsWith('---')) {
        // Standard "front matter" format.
        const result = content.match(/^-{3,}\s([\s\S]*?)-{3,}(\s[\s\S]*|\s?)$/);
        if (result.length === 3) {
            return {
                yamlSource: result[1],
                markdown: result[2]
            };
        }
    } else if (content.startsWith('```metadata\n')) {
        // Wintersmith format
        const end = content.indexOf('\n```\n');
        if (end !== -1) {
            return {
                yamlSource: content.substring(12, end),
                markdown: content.substring(end + 5)
            };
        }
    }

    return { 
        markdown: content, 
        yamlSource: '' 
    };
};

export class MarkdownPage extends Page {

    markdown: string;

    constructor(filepath: FilePath, metadata: Indexable, markdown: string) {
        super(filepath, metadata);
        this.markdown = markdown;
    }

    get name() {
        return 'MarkdownPage';
    }

    getLocation(baseUrl?: string) {
        const uri = this.getUrl(baseUrl);
        const finalSlashIdx = uri.lastIndexOf('/');
        return uri.substring(0, finalSlashIdx);
    }

    getHtml(base: string = this.__env.config.baseUrl): string {
        const options = this.__env.config.markdown || {};
        return parseMarkdown(this, this.markdown, this.getLocation(base), options);
    }

    static async fromFile(filepath: FilePath): Promise<MarkdownPage> {
        const buffer = await fs.readFile(filepath.full);
        const fileContent = splitContent(buffer.toString());
        const metadata = await extractMetadata(fileContent.yamlSource);
        return new MarkdownPage(filepath, metadata, fileContent.markdown);
    }
}

// Plugin that enables a "Markdown" page to be rendered from a JSON file containing just metadata.
// The JSON file can contain a "content" property containing Markdown to render, but this is optional.
export class JsonPage extends MarkdownPage {

    get name() {
        return 'JsonPage';
    }

    static async fromFile(filepath: FilePath): Promise<JsonPage> {
        const metadata = await readJson(filepath.full);
        const markdown = metadata?.content || '';
        return new JsonPage(filepath, metadata, markdown);
    }
}

// Register the Markdown and JSON plugins.
const registerPlugins = async (env: IEnvironment): Promise<void> => {
    env.registerContentPlugin('pages', '**/*.*(markdown|mkd|md)', MarkdownPage);
    env.registerContentPlugin('pages', '**/*.json', JsonPage);
};

export default registerPlugins;
