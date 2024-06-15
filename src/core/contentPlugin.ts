import * as utils from './utils.js';
import { IContentTree, FilePath, GeneratorDef, IEnvironment, ViewFunc } from './coreTypes.js';

export type ContentPluginDef = {
    name: string;
    group: string;  
    pattern: string;
    class: typeof ContentPlugin;
}

// The base class of content plugins.  It should be treated as an abstract class and not instantiated directly.
// Custom plugin implementations should provide their own implementations of the "name", "view" and "filename" getters, 
// and the fromFile() static function, in order to be useful.
export default class ContentPlugin {

    __env: IEnvironment;

    __plugin: ContentPluginDef | GeneratorDef;

    __filename: string;

    // Parent node in the content tree.
    parent: IContentTree | null;

    // Constructor provided to ensure that inheritors can declare a different constructor signature without upsetting Typescript.
    // eslint-disable-next-line
    constructor(...args: any[]) {}

    // Plugin name (used in diagnostic output).
    get name() { 
        return 'ContentPlugin';
    }

    // Should either a view function which can be called directly, or the name of a view plugin to call.  In the latter case, the plugin
    // must have been listed in the "views" section of the config.
    get view(): string | ViewFunc {
        throw new Error('view not implemented');
    }

    // Should return the name of the file this plugin will output.  See the Page plugin for an example implementation.
    get filename(): string {
        throw new Error('filename not implemented');
    }

    // In descendent classes, this function should create an instance of this plugin which will output content based on the content of the
    // given path, and on the rest of the content tree.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async fromFile(filepath: FilePath): Promise<ContentPlugin> {
        throw new Error('fromFile() not implemented');
    }

    // This function converts the plugin's filename property into a relative URL, using the configuration base URL.
    getUrl(baseUrl?: string): string {
        let filename = this.filename;
        let base = baseUrl || this.__env?.config.baseUrl;
        if (!base.match(/\/$/)) {
            base += '/';
        }
        if (process.platform === 'win32') {
            filename = filename.replace(/\\/g, '/');
        }
        return utils.urlResolve(base, filename);
    }

    // Utility getter which calls getUrl() with its default parameter taken from the config file.
    get url() {
        return this.getUrl(this.__env.config.baseUrl);
    }

    // The Chalk colour used to identify this plugin when printing the content tree.
    // Acceptable values include bold, italic, underline, inverse, yellow, cyan, magenta, rainbow, zebra and many others.
    // See the Chalk documentation for details - https://github.com/chalk/chalk
    get pluginColour(): string {
        return 'cyan';
    }

    // Information about this plugin, displayed by ContentTree.inspect()
    get pluginInfo(): string {
        return `url: ${this.getUrl()} plugin: ${this.name}`;
    }

    // In a content tree, this is a leaf node.  This should be true for all content plugins.  If it is false, the
    // tree-walking code expects to be able to walk into all of the enumerable properties of the object as tree nodes.
    get isLeaf(): boolean {
        return true;
    }
}
