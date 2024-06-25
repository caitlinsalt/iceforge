import { describe, expect, test, vi } from 'vitest';
import * as winston from 'winston';
import * as url from 'node:url';
import * as path from 'node:path';

import Environment from '../../core/environment';
import { defaultConfig } from '../../core/config';
import { transports } from '../../core/logger';
import StaticFile from '../../core/staticFile';
import { FakePlugin } from './fakes/fakePlugin';
import FakeTemplate from './fakes/fakeTemplate';
import { IContentTree } from '../../core/coreTypes';
import ContentTree from '../../core/contentTree';
import { JsonPage, MarkdownPage } from '../../plugins/markdown';
import { Page } from '../../plugins/page';

const testLogger = winston.createLogger({
    exitOnError: true,
    transports: transports,
    silent: true
});

describe('Constructor/factory() tests', () => {
    test('config property is set to first parameter', async () => {
        const testConfig = { ...defaultConfig };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.config).toBe(testConfig);
    });

    test('workdir property is set to second parameter', async () => {
        const testConfig = { ...defaultConfig };
        const expectedResult = 'testWorkplace';
        
        const testObject = await Environment.factory(testConfig, expectedResult, testLogger);

        expect(testObject.workDir.endsWith(expectedResult)).toBeTruthy();
    });

    test('logger property is set to third parameter', async () => {
        const testConfig = { ...defaultConfig };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.logger).toBe(testLogger);
    });

    test('helpers property is empty', async () => {
        const testConfig = { ...defaultConfig };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.helpers).toStrictEqual({});
    });

    test('loadedModules property is empty', async () => {
        const testConfig = { ...defaultConfig };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.loadedModules).toStrictEqual([]);
    });

    test('contentsPath property is set to config.contents', async () => {
        const testConfig = { ...defaultConfig, contents: 'testContentLocation' };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.contentsPath.endsWith(testConfig.contents)).toBeTruthy();
    });

    test('templatesPath property is set to config.templates', async () => {
        const testConfig = { ...defaultConfig, templates: 'testTemplateLocation' };
        
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.templatesPath.endsWith(testConfig.templates)).toBeTruthy();
    });

    test('views property contains the none view', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.views.none).toBeInstanceOf(Function);
    });

    test('views property only contains one view', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(Object.keys(testObject.views).length).toBe(1);
    });

    test('generators property is empty', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.generators).toStrictEqual([]);
    });

    test('plugins property contains StaticFile', async () => {
        const testConfig = { ...defaultConfig };

        const testobject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testobject.plugins.StaticFile).toBe(StaticFile);
    });

    test('plugins property only contains StaticFile', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(Object.keys(testObject.plugins).length).toBe(1);
    });

    test('templatePlugins property is empty', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.templatePlugins).toStrictEqual([]);
    });

    test('contentPlugins property is empty', async () => {
        const testConfig = { ...defaultConfig };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.contentPlugins).toStrictEqual([]);
    });

    test('locals property is empty if config.locals is empty, config.imports is empty and config.require is empty', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.locals).toStrictEqual({});
    });

    test('locals property contains data set in config.locals if config.locals is an object', async () => {
        const expectedResult = {
            test: 'value'
        };
        const testConfig = { ...defaultConfig, locals: expectedResult, imports: {}, require: {} };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.locals).toStrictEqual(expectedResult);
    });

    test('locals property contains data loaded from the file named in config.locals if config.locals is a string', async () => {
        const expectedResult = {
            test: 'valueFromFile'
        };
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeLocals.json');
        const testConfig = { ...defaultConfig, locals: fakePath, imports: {}, require: {} };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.locals).toStrictEqual(expectedResult);
    });

    test('locals property contains modules listed in config.imports', async () => {
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        const testConfig = { 
            ...defaultConfig, 
            locals: {}, 
            require: {}, 
            imports: {
                fakeModule: fakePath
            }
        };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });

    test('locals property contains modules listed in config.require', async () => {
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        const testConfig = { 
            ...defaultConfig, 
            locals: {}, 
            imports: {}, 
            require: {
                fakeModule: fakePath
            }
        };

        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });
});

describe('reset() tests', () => {
    test('helpers property is empty', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.helpers['mysteryFunction'] = () => false;

        await testObject.reset();

        expect(testObject.helpers).toStrictEqual({});
    });

    test('views property contains the none view', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.views['extraView'] = async () => null;

        await testObject.reset();

        expect(testObject.views.none).toBeInstanceOf(Function);
    });

    test('views property only contains one view', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.views['extraView'] = async () => null;

        await testObject.reset();

        expect(testObject.views['extraView']).toBeFalsy();
        expect(Object.keys(testObject.views).length).toBe(1);
    });

    test('generators property is empty', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push({ name: 'test', group: 'test', fn: async (x) => x});

        await testObject.reset();

        expect(testObject.generators).toStrictEqual([]);
    });

    test('plugins property contains StaticFile', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.plugins['FakePlugin'] = FakePlugin;

        await testObject.reset();

        expect(testObject.plugins.StaticFile).toBe(StaticFile);
    });

    test('plugins property only contains StaticFile', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.plugins['FakePlugin'] = FakePlugin;

        await testObject.reset();

        expect(testObject.plugins.FakePlugin).toBeFalsy();
        expect(Object.keys(testObject.plugins).length).toBe(1);
    });

    test('templatePlugins property is empty', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.templatePlugins.push({ pattern: '*', class: FakeTemplate });

        await testObject.reset();

        expect(testObject.templatePlugins).toStrictEqual([]);
    });

    test('contentPlugins property is empty', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.contentPlugins.push({ 
            name: 'testPluginDef',
            group: 'tests',
            pattern: '*',
            class: FakePlugin
        });

        await testObject.reset();

        expect(testObject.contentPlugins).toStrictEqual([]);
    });

    test('locals property is empty if config.locals is empty, config.imports is empty and config.require is empty', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.locals['testProperty'] = { value: 'test' };

        await testObject.reset();

        expect(testObject.locals).toStrictEqual({});
    });

    test('locals property contains data set in config.locals if config.locals is an object', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testConfig.locals = { value: 'test' };

        await testObject.reset();

        expect(testObject.locals).toStrictEqual({ value: 'test' });
    });

    test('locals property contains data loaded from the file named in config.locals if config.locals is a string', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testConfig.locals = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeLocals.json');

        await testObject.reset();

        expect(testObject.locals).toStrictEqual({
            test: 'valueFromFile'
        });
    });

    test('locals property contains modules listed in config.imports', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        testConfig.imports = { fakeModule: fakePath };

        await testObject.reset();

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });

    test('locals property contains modules listed in config.require', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        testConfig.require = { fakeModule: fakePath };

        await testObject.reset();

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });
});

describe('setConfig() tests', () => {
    test('config property is set', async () => {
        const initialTestConfig = { ...defaultConfig };
        const testConfig = { ...defaultConfig, contents: 'definitelyDifferent' };
        const testObject = await Environment.factory(initialTestConfig, 'testDir', testLogger);

        await testObject.setConfig(testConfig);

        expect(testObject.config).toStrictEqual(testConfig);
    });

    test('contentsPath property is set', async () => {
        const initialTestConfig = { ...defaultConfig };
        const testConfig = { ...defaultConfig, contents: 'definitelyDifferent' };
        const testObject = await Environment.factory(initialTestConfig, 'testDir', testLogger);

        await testObject.setConfig(testConfig);

        expect(testObject.contentsPath.endsWith('definitelyDifferent')).toBeTruthy();
    });

    test('templatesPath property is set', async () => {
        const initialTestConfig = { ...defaultConfig };
        const testConfig = { ...defaultConfig, templates: 'definitelyDifferent' };
        const testObject = await Environment.factory(initialTestConfig, 'testDir', testLogger);

        await testObject.setConfig(testConfig);

        expect(testObject.templatesPath.endsWith('definitelyDifferent')).toBeTruthy();
    });
});

describe('setupLocals() tests', () => {
    test('locals property is empty if config.locals is empty, config.imports is empty and config.require is empty', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.locals['testProperty'] = { value: 'test' };

        await testObject.setupLocals();

        expect(testObject.locals).toStrictEqual({});
    });

    test('locals property contains data set in config.locals if config.locals is an object', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testConfig.locals = { value: 'test' };

        await testObject.setupLocals();

        expect(testObject.locals).toStrictEqual({ value: 'test' });
    });

    test('locals property contains data loaded from the file named in config.locals if config.locals is a string', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testConfig.locals = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeLocals.json');

        await testObject.setupLocals();

        expect(testObject.locals).toStrictEqual({
            test: 'valueFromFile'
        });
    });

    test('locals property contains modules listed in config.imports', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        testConfig.imports = { fakeModule: fakePath };

        await testObject.setupLocals();

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });

    test('locals property contains modules listed in config.require', async () => {
        const testConfig = { ...defaultConfig, locals: {}, imports: {}, require: {} };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');
        testConfig.require = { fakeModule: fakePath };

        await testObject.setupLocals();

        expect(testObject.locals.fakeModule).toBeTruthy();
        expect(testObject.locals.fakeModule.testFunction).toBeInstanceOf(Function);
    });
});

describe('registerContentPlugin() tests', () => {
    test('Adds plugin constructor to plugins', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        testObject.registerContentPlugin('test', 'tests/*', FakePlugin);

        expect(testObject.plugins.FakePlugin).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBe(FakePlugin);
    });

    test('Adds correct plugin definition to contentPlugins', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        testObject.registerContentPlugin('test', 'tests/*', FakePlugin);

        expect(testObject.contentPlugins.length).toBe(1);
        expect(testObject.contentPlugins[0].class).toBe(FakePlugin);
        expect(testObject.contentPlugins[0].name).toBe('FakePlugin');
        expect(testObject.contentPlugins[0].group).toBe('test');
        expect(testObject.contentPlugins[0].pattern).toBe('tests/*');
    });
});

describe('registerTemplatePlugin() tests', () => {
    test('Adds plugin constructor to plugins', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        testObject.registerTemplatePlugin('*.test.template', FakeTemplate);

        expect(testObject.plugins.FakeTemplate).toBeTruthy();
        expect(testObject.plugins.FakeTemplate).toBe(FakeTemplate);
    });

    test('Adds correct plugin definition to templatePlugins', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        testObject.registerTemplatePlugin('*.test.template', FakeTemplate);

        expect(testObject.templatePlugins.length).toBe(1);
        expect(testObject.templatePlugins[0].class).toBe(FakeTemplate);
        expect(testObject.templatePlugins[0].pattern).toBe('*.test.template');
    });
});

describe('registerGenerator() tests', () => {
    test('Adds correct generator definition to generators if called with two parameters', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testGenerator = async (x: IContentTree) => x;

        testObject.registerGenerator('testGen', testGenerator);

        expect(testObject.generators.length).toBe(1);
        expect(testObject.generators[0].group).toBe('testGen');
        expect(testObject.generators[0].name).toBe('testGen');
        expect(testObject.generators[0].fn).toBe(testGenerator);
    });

    test('Adds correct generator definition to generators if called with three parameters', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testGenerator = async (x: IContentTree) => x;

        testObject.registerGenerator('testGen', 'genGroup', testGenerator);

        expect(testObject.generators.length).toBe(1);
        expect(testObject.generators[0].group).toBe('genGroup');
        expect(testObject.generators[0].name).toBe('testGen');
        expect(testObject.generators[0].fn).toBe(testGenerator);
    });
});

describe('registerView() tests', () => {
    test('Adds view to views correctly', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testView = async () => null;

        testObject.registerView('viewTest', testView);

        expect(testObject.views.viewTest).toBeTruthy();
        expect(testObject.views.viewTest).toBe(testView);
    });
});

describe('getContentGroups() tests', () => {
    test('Returns all groups defined by content plugins', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.contentPlugins.push(
            { name: 'fake1', group: 'firstTestGroup', pattern: '*', class: FakePlugin },
            { name: 'fake1', group: 'secondTestGroup', pattern: '*', class: FakePlugin }
        );

        const testOutput = testObject.getContentGroups();

        expect(testOutput.length).toBe(2);
        expect(testOutput).toContain('firstTestGroup');
        expect(testOutput).toContain('secondTestGroup');
    });

    test('Returns all groups defined by generators', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testGenerator = async (x: IContentTree) => x;
        testObject.generators.push(
            { name: 'fake', group: 'firstTestGen', fn: testGenerator },
            { name: 'fake', group: 'secondTestGen', fn: testGenerator }
        );

        const testOutput = testObject.getContentGroups();

        expect(testOutput.length).toBe(2);
        expect(testOutput).toContain('firstTestGen');
        expect(testOutput).toContain('secondTestGen');
    });

    test('Returns all groups defined by both plugins and generators', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testGenerator = async (x: IContentTree) => x;
        testObject.contentPlugins.push(
            { name: 'fake1', group: 'firstTestGroup', pattern: '*', class: FakePlugin },
            { name: 'fake1', group: 'secondTestGroup', pattern: '*', class: FakePlugin }
        );
        testObject.generators.push(
            { name: 'fake', group: 'firstTestGen', fn: testGenerator },
        );

        const testOutput = testObject.getContentGroups();

        expect(testOutput.length).toBe(3);
        expect(testOutput).toContain('firstTestGroup');
        expect(testOutput).toContain('secondTestGroup');
        expect(testOutput).toContain('firstTestGen');
    });

    test('Returns unique set of groups', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const testGenerator = async (x: IContentTree) => x;
        testObject.contentPlugins.push(
            { name: 'fake1', group: 'firstTestGroup', pattern: '*', class: FakePlugin },
            { name: 'fake1', group: 'secondTestGroup', pattern: '*', class: FakePlugin },
            { name: 'fake1', group: 'firstTestGroup', pattern: '*', class: FakePlugin }
        );
        testObject.generators.push(
            { name: 'fake', group: 'firstTestGroup', fn: testGenerator },
            { name: 'fake', group: 'secondTestGen', fn: testGenerator }
        );

        const testOutput = testObject.getContentGroups();

        expect(testOutput.length).toBe(3);
        expect(testOutput).toContain('firstTestGroup');
        expect(testOutput).toContain('secondTestGroup');
        expect(testOutput).toContain('secondTestGen');
    });
});

describe('loadModule() tests', () => {
    test('Adds module to loadedModules', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');

        await testObject.loadModule(fakePath);

        expect(testObject.loadedModules.length).toBe(1);
        expect(testObject.loadedModules[0]).toBe(fakePath);
    });

    test('Returns imported module', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeModule.ts');

        const testOutput = await testObject.loadModule(fakePath);

        expect(testOutput).toBeTruthy();
        expect(testOutput.default).toBeTruthy();
        expect(testOutput.default.testFunction).toBeInstanceOf(Function);
    });
});

describe('loadPluginModule() tests', () => {
    test('When called with a string, adds module to loadedModules', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');

        await testObject.loadPluginModule(fakePath);

        expect(testObject.loadedModules.length).toBe(1);
        expect(testObject.loadedModules[0]).toBe(fakePath);
    });

    test('When called with a string, calls the module\'s default export', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');
        const mockDefault = vi.fn(async () => true);
        vi.doMock(fakePath, (orig) => ({
            ...orig,
            default: mockDefault
        }));

        await testObject.loadPluginModule(fakePath);

        expect(mockDefault).toHaveBeenCalled();
    });

    test('When called with a module, calls the module\'s default export', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');
        const mockDefault = vi.fn(async () => true);
        vi.doMock(fakePath, (orig) => ({
            ...orig,
            default: mockDefault
        }));
        const fakeModule = await import(fakePath);

        await testObject.loadPluginModule(fakeModule);

        expect(mockDefault).toHaveBeenCalled();
    });
});

describe('loadViewModule() tests', () => {
    test('Adds module to loadedModules', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeView.ts');

        await testObject.loadViewModule(fakePath);

        expect(testObject.loadedModules.length).toBe(1);
        expect(testObject.loadedModules[0]).toBe(fakePath);
    });

    test('Adds module\'s default export to views', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakeView.ts');

        await testObject.loadViewModule(fakePath);
        
        expect(Object.keys(testObject.views).length).toBe(2);
        expect(testObject.views['fakeView.ts']).toBeTruthy();
        const testCheckOutput = await (testObject.views['fakeView.ts'])(testObject, {}, new ContentTree('test'), {}) as Buffer;
        expect(testCheckOutput).toBeTruthy();
        expect(testCheckOutput.toString()).toBe('Fake output');
    });
});

describe('loadPlugins() tests', () => {
    test('Loads MarkdownPage plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadPlugins();

        expect(testObject.loadedModules.find(x => x.endsWith('markdown.ts'))).toBeTruthy();
        expect(testObject.plugins.MarkdownPage).toBeTruthy();
        expect(testObject.plugins.MarkdownPage).toBe(MarkdownPage);
        const testCheck = testObject.contentPlugins.find(p => p.class === MarkdownPage);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.name).toBe('MarkdownPage');
        expect(testCheck?.group).toBe('pages');
        expect(testCheck?.pattern).toBe('**/*.*(markdown|mkd|md)');
    });

    test('Loads JsonPage plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadPlugins();

        expect(testObject.plugins.JsonPage).toBeTruthy();
        expect(testObject.plugins.JsonPage).toBe(JsonPage);
        const testCheck = testObject.contentPlugins.find(p => p.class === JsonPage);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.name).toBe('JsonPage');
        expect(testCheck?.group).toBe('pages');
        expect(testCheck?.pattern).toBe('**/*.json');
    });

    test('Loads Page plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadPlugins();

        expect(testObject.loadedModules.find(x => x.endsWith('page.ts'))).toBeTruthy();
        expect(testObject.plugins.Page).toBeTruthy();
        expect(testObject.plugins.Page).toBe(Page);
        expect(testObject.views.template).toBeInstanceOf(Function);
    });

    test.todo('Loads PugTemplate plugin');
    test.todo('Loads plugin listed in config object');
});

describe('loadViews() tests', () => {
    test.todo('Succeeds if config.views is empty');
    test.todo('Loads views from config.views');
});

describe('getContents() tests', () => {
    test.todo('Loads content tree from files'); 
    test.todo('Calls all generators');
    test.todo('Includes content loaded from generators in tree');
    test.todo('Merges content from files and content from generators');
});

describe('getLocals() tests', () => {
    test.todo('Returns this.locals asynchronously');
});

describe('getTemplates() tests', () => {
    test.todo('Calls loadTemplates()');
    test.todo('Returns result of loadTemplates() call');
});

describe('load() tests', () => {
    test.todo('Loads MarkdownPage plugin');
    test.todo('Loads JsonPage plugin');
    test.todo('Loads Page plugin');
    test.todo('Loads PugTemplate plugin');
    test.todo('Loads plugin listed in config object');
    test.todo('Succeeds if config.views is empty');
    test.todo('Loads views from config.views');
    test.todo('Loads content tree from files'); 
    test.todo('Calls all generators');
    test.todo('Includes content loaded from generators in tree');
    test.todo('Merges content from files and content from generators');
    test.todo('Calls loadTemplates()');
    test.todo('Returns result of loadTemplates() call');
    test.todo('Returns this.locals');
});

describe('preview() tests', () => {
    test.todo('Sets mode to preview');
    test.todo('Calls server.run()');
});

describe('build() tests', () => {
    test.todo('Sets mode to build');
    test.todo('Loads MarkdownPage plugin');
    test.todo('Loads JsonPage plugin');
    test.todo('Loads Page plugin');
    test.todo('Loads PugTemplate plugin');
    test.todo('Loads plugin listed in config object');
    test.todo('Succeeds if config.views is empty');
    test.todo('Loads views from config.views');
    test.todo('Loads content tree from files'); 
    test.todo('Calls all generators');
    test.todo('Includes content loaded from generators in tree');
    test.todo('Merges content from files and content from generators');
    test.todo('Calls loadTemplates()');
    test.todo('Calls render()');
});
