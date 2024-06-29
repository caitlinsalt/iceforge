import { vi } from 'vitest';
import winston from 'winston';

import { testLogger } from '../../testUtils';

import { ContentPluginDef } from '../../../core/contentPlugin';
import { GeneratorDef, GeneratorFunc, IConfig, IEnvironment, Indexable, PluginMap, ViewMap } from '../../../core/coreTypes';
import { defaultConfig } from '../../../core/config';
import { TemplatePluginDef } from '../../../core/templatePlugin';

export class FakeEnvironment implements IEnvironment {

    config: IConfig;

    contentPlugins: ContentPluginDef[];

    contentsPath: string;

    generators: GeneratorDef[];

    helpers: object;

    logger: winston.Logger = testLogger;

    mode: string;

    plugins: PluginMap;

    templatesPath: string;

    templatePlugins: TemplatePluginDef[];

    views: ViewMap;

    constructor(config?: Indexable) {
        this.config = { ...defaultConfig, ...config };
        this.contentPlugins = [];
        this.contentsPath = this.config.contents;
        this.generators = [];
        this.helpers = {};
        this.plugins = {};
        this.templatesPath = this.config.templates;
        this.templatePlugins = [];
        this.views = { none: () => Promise.resolve(null) }; 
    }

    getContentGroups() {
        return [];
    }

    registerView(name, view) {
        this.views[name] = view;
    }

    relativeContentsPath(path) {
        return path;
    }

    resolvePath(path) {
        return path;
    }

    build() {
        return Promise.resolve();
    }

    preview() {
        return Promise.resolve();
    }

    registerTemplatePlugin(pattern, plugin) {
        this.plugins[plugin.name] = plugin;
        this.templatePlugins.push({
            pattern,
            class: plugin
        });
    }

    registerContentPlugin(group, pattern, plugin) {
        this.plugins[plugin.name] = plugin;
        this.contentPlugins.push({
            name: plugin.name,
            group,
            pattern,
            class: plugin
        });
    }

    registerGenerator(name: string, generator: GeneratorFunc): void;
    registerGenerator(name: string, group: string, generator: GeneratorFunc): void;
    registerGenerator(name: string, groupOrGenerator: string | GeneratorFunc, generator?: GeneratorFunc) {
        if (typeof groupOrGenerator === 'string') {
            this.generators.push({
                name,
                group: groupOrGenerator,
                fn: generator || vi.fn(),
            });
        } else {
            this.generators.push({
                name,
                group: name,
                fn: groupOrGenerator
            });
        }
    }
}