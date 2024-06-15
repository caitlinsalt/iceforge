import * as path from 'node:path';
import vm from 'node:vm';
import GithubSlugger from 'github-slugger';

import * as utils from '../core/utils.js';
import ContentPlugin from '../core/contentPlugin.js';
import { FilePath, IContentTree, IEnvironment, TemplateMap, Indexable, LocalMap, RenderedData, StringMap } from '../core/coreTypes.js';

const replaceAll = (str: string, map: StringMap) => {
    const re = new RegExp(Object.keys(map).join('|'), 'gi');
    return str.replace(re, (match) => map[match]);
};

// A ContentPage implementation that contains a lot of useful boilerplate functions, but is still essentially an abstract class.
// This class is an ancester of all of the content plugins shipped with Iceforge aside from the fallback static file plugin.
// Concrete implementations of this class must override the getHtml() function.
//
// The boilerplate functions in this class expect all pages to have a template metadata property, and/or a view metadata property.  The latter
// specifies that the page should be rendered with a non-default named view function loaded from a plugin.  The former specifies the template name
// that the default view function will use for rendering (and potentially is meaningful to other view functions, if view is also specified).
export class Page extends ContentPlugin {
    filepath;

    metadata;

    constructor(filepath: FilePath, metadata: Indexable) {
        super();
        this.filepath = filepath;
        this.metadata = metadata;
    }

    get name() {
        return 'Page';
    }

    // Generate the filename by processing the replacement strings in the filename template.
    // If you are using this plugin directly, the filename template is set in the page metadata.  If not set, the default
    // value is ":file.html", but this can be overridden in the config file.
    get filename() {
        const slugger = new GithubSlugger();
        const template = this.filenameTemplate;
        const dirname = path.dirname(this.filepath.relative);
        const basename = path.basename(this.filepath.relative);
        const file = utils.stripExtension(basename);
        const ext = path.extname(basename);

        let filename = replaceAll(template, {
            ':year': this.date.getFullYear().toString(),
            ':month': ('0' + (this.date.getMonth() + 1)).slice(-2),
            ':day': ('0' + (this.date.getDay() + 1)).slice(-2),
            ':title': slugger.slug(this.title),
            ':file': file,
            ':ext': ext,
            ':basename': basename,
            ':dirname': dirname
        });
        filename = filename.replace(/\{\{(.*?)\}\}/g, (match, code) => {
            const ctx = vm.createContext({env: this.__env, page: this});
            return vm.runInContext(code, ctx);
        });
        if (filename.startsWith('/')) {
            return filename.slice(1);
        }
        return path.join(dirname, filename);
    }

    // Strip index.html off the end of URLs for neatness.
    getUrl(baseUrl?: string) {
        return super.getUrl(baseUrl).replace(/([/^])index\.html$/, '$1');
    }

    // A page can use a named view function loaded from a view plugin, specified in the page's metadata, 
    // or the default view function for pages.  This plugin's registration routine also registers its default view function.
    get view() {
        return this.metadata.view || 'template';
    }

    // Override this function when subclassing this class, not the html() getter.  It must return the rendered page.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getHtml(base: string = this.__env.config.baseUrl): string {
        throw new Error('Not implemented');
    }

    get html() { return this.getHtml(); }

    // If the page is split into an intro and main text, this function will pull out the (rendered) intro.  If not, it returns the fullly rendered page.
    // You can detect whether or not the page has an intro using the hasMore() getter.
    getIntro(base?: string) {
        const html = this.getHtml(base);
        const cutOffs = this.__env.config.introCutoffs || ['<span class="more', '<h2', '<hr'];
        let idx = Infinity;
        for (const cutOff of cutOffs) {
            const i = html.indexOf(cutOff);
            if (i !== -1 && i < idx) {
                idx = i;
            }
        }
        if (idx !== Infinity) {
            return html.substring(0, idx);
        }
        return html;
    }

    get intro() { return this.getIntro(); }

    get filenameTemplate() {
        return this.metadata.filename || this.__env.config.filenameTemplate || ':file.html';
    }

    get template() {
        return this.metadata.template || this.__env.config.defaultTemplate || 'none';
    }

    get title() {
        return this.metadata.title || 'Untitled';
    }

    get date() {
        return new Date(this.metadata.date || 0);
    }

    get rfc2822date() {
        return utils.rfc2822(this.date);
    }

    get rfc822date() {
        return this.rfc2822date;
    }

    // Returns true if the page has an introduction.
    get hasMore() {
        const html = this.getHtml();
        const intro = this.getIntro();
        return html.length > intro.length; 
    }
}

// The default view function for pages.  Looks up the template named in the page metadata and calls its render() method.
const templateView = async (env: IEnvironment, locals: LocalMap, contentTree: IContentTree, templates: TemplateMap, content: ContentPlugin): Promise<RenderedData> => {

    const page = content as Page;
    if (page.template === 'none') {
        return;
    }

    const template = templates[path.normalize(page.template)];
    if (!template) {
        throw new Error(`Page '${page.filename}' specifies unknown template '${page.template}`);
    }

    const ctx = { page: page, ...locals };
    return await template.render(ctx);
};

// Registers the page plugin and its default view function.
const registerPlugin = async (env: IEnvironment): Promise<void> => {
    env.plugins['Page'] = Page;
    env.registerView('template', templateView);
};

export default registerPlugin;
