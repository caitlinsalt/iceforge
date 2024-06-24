import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { Logger } from 'winston';

import { 
    GeneratorDef, 
    GeneratorFunc, 
    IConfig, 
    IEnvironment, 
    ImportedModule, 
    Indexable, 
    PluginMap, 
    ViewFunc, 
    ViewMap 
} from './coreTypes.js';
import ContentTree from './contentTree.js';
import { loadTemplates } from './loadTemplates.js';
import { readJson } from './utils.js';
import runGenerator from './generator.js';
import { logger } from './logger.js';
import Config from './config.js';
import render from './render.js';
import TemplatePlugin, { TemplatePluginDef } from './templatePlugin.js';
import ContentPlugin, { ContentPluginDef } from './contentPlugin.js';
import StaticFile from './staticFile.js';

// The class that represents the Iceforge build-time environment.  Its properties are exposed to
// plugins and templates at both registration time and site build time.
export default class Environment extends EventEmitter implements IEnvironment {

    // The configuration
    config: IConfig;

    // Logger
    logger;

    // Working directory
    workDir;

    // Whether Iceforge is running in build mode or preview mode.  Could be used to generate different
    // content if the site is being used in the preview server.
    mode: string;

    // An array of module names that have been imported.
    loadedModules: string[];

    // Available standalone view functions.
    views: ViewMap;

    // Page generator plugins.
    generators: GeneratorDef[];

    // Content and template plugins, indexed by class name.  Can be used to create plugin classes that
    // definitely inherit from a previously-loaded plugin, not from a different copy or version of Iceforge.
    plugins: PluginMap;

    // Template plugins, in registration order.  They are searched in reverse order at lookup time.
    templatePlugins: TemplatePluginDef[];

    // Content plugins, in registration order.  They are searched in reverse order at lookup time.
    contentPlugins: ContentPluginDef[];

    // An object that can be used to expose helper functions to plugins and templates.
    helpers: object;

    // All of the environment's local data, including any configuration set in the config.locals object.
    locals: Indexable;

    // Path to the site's contents folder.
    contentsPath: string;

    // Path to the site's templates folder.
    templatesPath: string;

    // This should not be called.  Instead, the asynchroous static factory method should be called, as this
    // also runs the asynchronous part of environment loading.
    private constructor(config: IConfig, workDir: string, logger: Logger) {
        super();
        this.helpers = {};
        this.logger = logger;
        this.loadedModules = [];
        this.workDir = path.resolve(workDir);
        this.setConfig(config);
    }

    // This is the normal entry point for constructing an Environment object.  It sets the config, the working
    // directory and the logging settings; and then loads the site content based on the settings in the config file.
    // Imported modules are loaded first, followed by plugin modules, and finally the site content.
    static async factory(config: IConfig, workDir: string, logger: Logger) {
        const env = new Environment(config, workDir, logger);
        await env.reset();
        return env;
    }

    // This function resets the environment as far as is possible and loads it based on the configuration.
    // The Wintersmith equivalent of this function unloads dynamic imports, but this is not straightforward to achieve
    // with ES6 modules.
    async reset() {

        // Reset the view map, the generator map, the plugin maps and the helpers object.
        this.views = {
            none: () => Promise.resolve(null)
        };
        this.generators = [];
        this.plugins = { StaticFile };
        this.templatePlugins = [];
        this.contentPlugins = [];
        this.helpers = {};

        // In Wintersmith, modules get unloaded at this point.  Not possible with imports.
        await this.setupLocals();
    }

    setConfig(config: IConfig) {
        this.config = config;
        this.contentsPath = this.resolvePath(config.contents);
        this.templatesPath = this.resolvePath(config.templates);
    }

    // Load the contents of config.locals into this.locals; then import any modules listed in
    // config.require and config.imports and make their default exports accessible as properties 
    // of this.locals also.
    async setupLocals() {
        this.locals = {};
        if (typeof this.config.locals === 'string') {
            const filename = this.resolvePath(this.config.locals);
            this.logger.verbose(`Loading locals from ${filename}`);
            this.locals = await readJson(filename);
        } else {
            this.locals = { ...this.config.locals };
        }

        const importables = { ...this.config.require, ...this.config.imports };
        logger.verbose(`Loading the following: ${JSON.stringify(importables)}`);
        for (const alias of Object.keys(importables)) {
            logger.verbose(`Loading module '${importables[alias]}' available in locals as '${alias}'`);
            if (alias in this.locals) {
                logger.warn(`Module '${importables[alias]}' overwrites previous local with the same key ('${alias}')`);
            }
            try {
                this.locals[alias] = (await this.loadModule(importables[alias])).default;
            } catch (error) {
                this.logger.warn(`Unable to load '${importables[alias]}': ${error.message}`);
            }
        }
    }

    // Resolve a path against the working directory.
    resolvePath(pathname: string) {
        return path.resolve(this.workDir, pathname);
    }

    // Resolve a path against the contents directory.
    resolveContentsPath(pathname?: string) {
        return path.resolve(this.contentsPath, pathname || '');
    }

    // Resolve a module.
    resolveModule(module: string) {
        const require = createRequire(import.meta.url);
        let nodeDir;
        switch (module[0]) {
        case '.':
            return require.resolve(this.resolvePath(module));
        case '/':
            return require.resolve(module);
        default:
            nodeDir = this.resolvePath('node_modules');
            try {
                return require.resolve(module, { paths: [nodeDir] });
            } catch (error) {
                logger.warn(error.message);
                return require.resolve(module);
            }
        }
    }

    // Get a path relative to the working directory.
    relativePath(pathname: string) {
        return path.relative(this.workDir, pathname);
    }

    // Get a path relative to the content directory.
    relativeContentsPath(pathname: string) {
        return path.relative(this.contentsPath, pathname);
    }

    // Register a content plugin with the environment, providing:
    // - the plugin group name
    // - the glob pattern of filenames that this plugin will use as input.
    // - the constructor of the plugin class
    // When the app is building the content tree and finds a content file whose filename matches the glob pattern, it will use 
    // the plugin's static fromFile() function to instantiate the plugin.  Registered plugins are searched in last-registered-first order.
    registerContentPlugin(group: string, pattern: string, plugin: typeof ContentPlugin) {
        this.logger.verbose(`Registering content plugin ${plugin.name} that handles ${pattern}`);
        this.plugins[plugin.name] = plugin;
        this.contentPlugins.push({
            name: plugin.name,
            group,
            pattern,
            class: plugin
        });
    }

    // Register a template plugin with the environment, providing:
    // - the glob pattern of filenames that this plugin will use as input
    // - the constructor of the plugin class.
    // When the app is loading templates and finds a template file whose filename matches the glob patern, it will use
    // the plugin's static fromFile() function to instantiate the plugin, then put the instance into the template map
    // indexed by filename.
    registerTemplatePlugin(pattern: string, plugin: typeof TemplatePlugin) {
        this.logger.verbose(`Registering template plugin ${plugin.name} that handles ${pattern}`);
        this.plugins[plugin.name] = plugin;
        this.templatePlugins.push({
            pattern,
            class: plugin
        });
    }

    // Register a generator function.
    // Generator functions are called in sequence after the primary (file-based) content tree has been loaded, to add further content plugin
    // instances to the content tree.
    registerGenerator(name: string, generator: GeneratorFunc): void;
    registerGenerator(name: string, group: string, generator: GeneratorFunc): void;
    registerGenerator(name: string, groupOrGenerator: string | GeneratorFunc, generator?: GeneratorFunc) {
        if (typeof groupOrGenerator === 'string') {
            this.generators.push({
                name,
                group: groupOrGenerator,
                fn: generator
            });
        } else {
            this.generators.push({
                name,
                group: name,
                fn: groupOrGenerator
            });
        }
    }

    // Register a named view function.  Content plugins may return the name of a registered view function to render their content, or may return
    // a function themselves.
    registerView(name: string, view: ViewFunc) {
        this.views[name] = view;
    }

    // Returns the set of all content group names defined by registered content plugins or generator plugins.
    getContentGroups() {
        const groups: string[] = [];
        for (const plugin of this.contentPlugins) {
            if (!groups.includes(plugin.group)) {
                groups.push(plugin.group);
            }
        }
        for (const generator of this.generators) {
            if (!groups.includes(generator.group)) {
                groups.push(generator.group);
            }
        }
        return groups;
    }

    // Resolve and import a module.
    async loadModule(module: string) {
        const id = this.resolveModule(module);
        const rv = await import(pathToFileURL(id).toString());
        this.loadedModules.push(id);
        return rv;
    }

    // Import a general plugin module and call its default export.  The module's default export function is expected 
    // to carry out its own plugin registration by calling functions of this class, and do any other necessary setup.
    async loadPluginModule(module: string | ImportedModule) {
        let id = 'unknown';
        if (typeof module === 'string') {
            id = module;
            try {
                module = await this.loadModule(module) as ImportedModule;
            } catch (error) {
                error.message = `Error loading plugin '${id}': ${error.message}`;
                throw error;
            }
        }

        try {
            await module.default(this);
        } catch (error) {
            error.message = `Error loading plugin '${id}': ${error.message}`;
            throw error;
        }
    }

    // Import a view plugin module and register its default export as a named view function.
    async loadViewModule(id: string) {
        this.logger.verbose(`Loading view '${id}'`);
        let module;
        try {
            module = await this.loadModule(id);
        } catch (error) {
            error.message = `Error loading view '${id}': ${error.message}`;
            return error;
        }
        this.registerView(path.basename(id), module.default);
    }

    // Load general plugin modules and register their plugins, starting with the three plugins defined in 
    // the static Environment.defaultPlugins array.  Other plugins are registered in the order they are
    // listed in the configuration file.
    async loadPlugins() {
        const require = createRequire(import.meta.url);
        for (const plugin of Environment.defaultPlugins) {
            this.logger.verbose(`Loading default plugin ${plugin}`);
            const id = pathToFileURL(require.resolve(`./../plugins/${plugin}`)).toString();
            const module = await import(id);
            this.loadedModules.push(id);
            await this.loadPluginModule(module);
        }
        for (const plugin of this.config.plugins) {
            this.logger.verbose(`Loading plugin ${plugin}`);
            await this.loadPluginModule(plugin);
        }
    }

    // Load view plugins.
    async loadViews() {
        if (!this.config.views) {
            return;
        }
        const filenames = await fs.readdir(this.resolvePath(this.config.views));
        const modules = filenames.map(f => `${this.config.views}/${f}`);
        for (const module in modules) {
            await this.loadViewModule(module);
        }
    }

    // Load the content tree.  This function builds a primary content tree from the config.contentsPath directory, 
    // runs all generator functions, and merges all generated trees into the primary content tree.
    async getContents() {
        const contents = await ContentTree.fromDirectory(this, this.contentsPath);
        const generated = await Promise.all(this.generators.map((g) => runGenerator(this, contents, g)));                
        const tree = new ContentTree('', this.getContentGroups());
        for (const gentree of generated) {
            ContentTree.merge(tree, gentree);
        }
        ContentTree.merge(tree, contents);
        return tree;
    }

    // Retained for compatibility with Wintersmith.
    getLocals() {
        return Promise.resolve(this.locals);
    }

    // Load and return the templates.
    async getTemplates() {
        return await loadTemplates(this);
    }

    // Loads the environment fully:
    // - loads general plugins
    // - loads view plugins
    // - loads the content tree
    // - loads the templates
    // - returns the content tree, the templates and the local data.
    async load() {
        await this.loadPlugins();
        await this.loadViews();
        return {
            contents: await this.getContents(),
            templates: await this.getTemplates(),
            locals: this.locals,
        };
    }

    // Starts up the preview mode server.
    async preview() {
        this.mode = 'preview';
        const server = await import('./server.js');
        await server.run(this);
    }

    // Runs a site build.
    async build(outputDir?: string) {
        this.mode = 'build';
        outputDir = outputDir || this.resolvePath(this.config.output);
        const { contents, templates, locals } = await this.load();
        await render(this, outputDir, contents, templates, locals);
    }

    // Factory method to create a new instance.  This function loads the config for you, 
    // whereas Environment.factory() expects a pre-loaded config object.
    static async create(config: string | IConfig, workdir: string | null, logger: Logger) {
        if (typeof config === 'string') {
            workdir = workdir || path.dirname(config);
            config = await Config.fromFile(config);
        } else {
            workdir = workdir || process.cwd();
        }
        return await Environment.factory(config, workdir, logger);
    }

    // Default list of plugins to load.
    static defaultPlugins = ['page', 'pug', 'markdown'];
}
