import { IConfig, ModuleMap } from './coreTypes.js';
import { fileExists, readJson } from './utils.js';

export const minimatchOptions = {
    dot: false,
};

export default class Config implements IConfig {

    // Path to the site contents directory.
    contents: string;

    // List of glob patterns of files to ignore.
    ignore: string[];

    // Local context, passed to the generation pipeline.  This is useful for storing any configuration settings
    // that need to be accessed from plugins or templates.  It is either an object, or the name of a JSON file to 
    // be loaded at environment initialisation.
    locals: object | string;

    // List of content plugins, generator plugins or template plugins to load, in addition to the default plugins.  
    // These can either be relative paths to JavaScript modules, or the names of modules installed by npm.  
    // You will likely want to install the latter using 'npm install' before referencing them here, in order 
    // for module import to work.  An Iceforge content or template plugin module's default export should be a 
    // function which takes the Iceforge environment as its parameter.  See the documentation for further details.
    // A given module may register any number of plugins, and any combination of the three plugin types.
    //
    // Do not list untrusted modules; they will be imported and their default export may be run when Iceforge is run.
    plugins: string[];

    // Object containing modules to import before generating any files.  For example, JS libraries
    // you may want to access when rendering templates.  Each entry's key is the alias it can be accessed by
    // in the render context, and the value is the name of the library.  
    imports: ModuleMap;

    // require is a synonym for imports, retained for backwards compatibility with Wintersmith.  The contents of require
    // are imported before the contents of imports.
    require?: ModuleMap;

    // Path to the templates directory.  Files in this directory will be treated as templates.
    templates: string;

    // Directory to load view plugins from.  For many sites this will be empty or not set, because the content plugins
    // used will supply their own views (as do all the default plugins provided by Iceforge).  An Iceforge view plugin's
    // default export should be a ViewFunc.  See the documentation for further details.
    //
    // Do not list untrusted modules; they will be imported and their default export may be run when Iceforge is run.
    views: string | null;

    // Output path for the `iceforge build` command.  Defaults to './build'
    output: string;

    // URL base path for the site, *not* its absolute URL.  Defaults to '/'.
    baseUrl: string;

    // Preview server hostname.  Defaults to localhost.
    hostname: string | null;

    // Preview server port.  Defaults to 8080.
    port: number;

    // Restart preview server on config change.
    restartOnConfigChange: boolean;

    // In build mode, render pages in parallel.
    parallelRender: boolean;

    // File that this configuration object was loaded from.
    filename: string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [index: string]: any;

    constructor(options?: IConfig) {
        const mergedConfig: IConfig = {...defaultConfig, ...options};
        for (const item of Object.keys(mergedConfig)) {
            this[item] = mergedConfig[item];
        }
    }

    // Create a new Config instance by loading a JSON file and using its 
    // contents as the configuration values of the new instance.
    static async fromFile(path: string) : Promise<Config> {
        const exists = await fileExists(path);
        if (!exists) {
            throw new Error(`Config file ${path} does not exist.`);
        }
        const data = await readJson(path);
        const config = new Config(data as IConfig);
        config.filename = path;
        return config;
    }
}

export const defaultConfig: IConfig = {
    contents: './contents',
    ignore: [],
    locals: {},
    plugins: [],
    imports: {},
    filename: null,
    templates: './templates',
    views: null,
    output: './build',
    baseUrl: '/',
    hostname: null,
    port: 8080,
    restartOnConfigChange: true,
    parallelRender: true,
};
