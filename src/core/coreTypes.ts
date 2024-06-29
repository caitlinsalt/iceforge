import * as winston from 'winston';
import TemplatePlugin, { TemplatePluginDef } from './templatePlugin.js';
import ContentPlugin, { ContentPluginDef } from './contentPlugin.js';
import { ReadStream } from 'fs';
import { ParsedArgs } from 'minimist';

// Type of the configuration file.
export interface IConfig {
    contents: string;
    filename: string;
    ignore: string[];
    locals: object | string;
    plugins: string[];
    imports: ModuleMap;
    require?: ModuleMap;
    templates: string;
    views: string;
    output: string;
    baseUrl: string;
    absoluteBaseUrl?: string;
    hostname: string;
    port: number;
    restartOnConfigChange: boolean;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any;
}

// Command-line options usable by multiple command verbs.
export interface CommonOptions extends ParsedArgs {
    chdir?: string;
    config?: string;
    port?: number;
    require?: string;
}

// Type which can map a URL path to a content plugin.  Used by the server to choose what content to serve for each request.
export type ContentMap = {
    [index: string]: ContentPlugin;
}

// A non-leaf node in the content tree.
export interface IContentTree {
    [index: string]: IContentTree | ContentPlugin | ContentTreeGroups | string[] | string;
    filename?: string;
    parent?: IContentTree;
    _?: ContentTreeGroups;
    __groupnames?: string[];
}

// Type of the _ property of a non-leaf node in the content tree, containing the child nodes of a content tree node, categorised into groups.
export type ContentTreeGroups = {
    directories: IContentTree[];
    files: ContentPlugin[];
    [index: string]: (ContentPlugin | IContentTree)[];
};

// Type that is common to both ContentTree and ContentPlugin, used in type guards to distinguish between those two.
export type ContentTreeNode = {
    isLeaf: boolean;
}

// The Iceforge environment and its API.
export interface IEnvironment {
    config: IConfig;
    contentPlugins: ContentPluginDef[];
    contentsPath: string;
    generators: GeneratorDef[];
    helpers: object;
    logger: winston.Logger;
    mode: string;
    plugins: PluginMap;
    templatesPath: string;
    templatePlugins: TemplatePluginDef[];
    views: ViewMap;

    getContentGroups: () => string[];
    registerView: (name: string, view: ViewFunc) => void;
    relativeContentsPath: (pathname: string) => string;
    resolvePath: (pathname: string) => string;
    build: (outputDir?: string) => Promise<void>;
    registerTemplatePlugin: (pattern: string, plugin: typeof TemplatePlugin) => void;
    registerContentPlugin: (group: string, pattern: string, plugin: typeof ContentPlugin) => void;
    registerGenerator: EnvironmentRegisterGeneratorFunc;
    preview: () => Promise<void>;
}

type EnvironmentRegisterGeneratorFunc = ((name: string, fn: GeneratorFunc) => void) | ((name: string, group: string, fn: GeneratorFunc) => void);

// A utility type representing a file path.
export type FilePath = {
    full: string;
    relative: string;
}

// The function signature which must be implemented by a generator plugin.  It takes a content tree, and returns a second 
// content tree which the calling routine will merge into the primary tree.
// It should not modify the content tree parameter.
//
// If a generator function needs to access the environment, it should be passed in at generator function registration.
export type GeneratorFunc = (contents: IContentTree) => Promise<IContentTree>;

// A generator plugin definition, consisting of the parameters passed to the Environment.registerGenerator() function
// - generator name
// - plugin group used by this plugin's generated pages
// - generator function
export type GeneratorDef = {
    name: string;
    group: string;
    fn: GeneratorFunc;
}

// Definition of an Iceforge plugin module: a module whose default export is an async function with an IEnvironment parameter.
export interface ImportedModule {
    default: (env: IEnvironment) => Promise<void>;
}

// Utility type for any object with a string-addressed index operator.
export type Indexable = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any
}

// Logging options.
export interface ILoggerOptions extends winston.transport.TransportStreamOptions {
    quiet?: boolean;
}

// A logging message.
export interface ILoggable {
    level: string;
    message: string;
    meta?: ILoggableMetadata;
}

// Metadata attached to a logging message.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ILoggableMetadata extends Record<string, any> {
    stack?: string;
}

// The type of the context object passed to render functions.
export type LocalMap = Indexable;

// Map of imported modules, keyed on the module alias.
export type ModuleMap = StringMap;

// Map of loaded content and template plugins.
export type PluginMap = Record<string, typeof ContentPlugin | typeof TemplatePlugin>;

// The return type of a render function.
export type RenderedData = ReadStream | Buffer | null;

export type StringMap = Record<string, string>;

// Type of the loaded template map.
export type TemplateMap = Record<string, TemplatePlugin>;

// The function signature of a view plugin.
export type ViewFunc = (env: IEnvironment, locals: LocalMap, contentTree: IContentTree, templates: TemplateMap, content?: ContentPlugin) => Promise<RenderedData>;

// The map of loaded view plugins, including a special 'none' value for pages which do not produce any rendered output.
export type ViewMap = {
    none: ViewFunc;
    [index: string]: ViewFunc;
}
