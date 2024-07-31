import { afterEach, describe, expect, test, vi } from 'vitest';
import * as url from 'node:url';
import * as path from 'node:path';
import { createServer } from 'node:http';

import Environment from '../../core/environment';
import { defaultConfig } from '../../core/config';
import StaticFile from '../../core/staticFile';
import { IContentTree, GeneratorDef } from '../../core/coreTypes';
import ContentTree from '../../core/contentTree';
import loadTemplates from '../../core/loadTemplates';
import { Page } from '../../plugins/page';
import { PugTemplate } from '../../plugins/pug';
import { JsonPage, MarkdownPage } from '../../plugins/markdown';
import runGenerator from '../../core/generator';
import ContentPlugin from '../../core/contentPlugin';
import render from '../../core/render';

import { FakePlugin } from './fakes/fakePlugin';
import FakeTemplate from './fakes/fakeTemplate';
import { expectEquivalentTrees, getFakeTree, testLogger } from '../testUtils';

vi.mock('../../core/loadTemplates');
vi.mock('../../core/server');
vi.mock('../../core/contentTree', async (imp) => {
    const orig = await imp<typeof import('../../core/contentTree')>();
    orig.default.fromDirectory = vi.fn();
    return orig;
});
vi.mock('../../core/generator');
vi.mock('../../core/render', () => ({
    default: vi.fn(() => Promise.resolve())
}));

afterEach(() => {
    vi.resetAllMocks();
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
        vi.doUnmock(fakePath);
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
        vi.doUnmock(fakePath);
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

    test('Loads PugTemplate plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadPlugins();

        expect(testObject.loadedModules.find(x => x.endsWith('pug.ts'))).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBe(PugTemplate);
        const testCheck = testObject.templatePlugins.find(p => p.class === PugTemplate);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.pattern).toBe('**/*.*(pug|jade)');
    });

    test('Loads plugin listed in config object', async () => {
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');
        const testConfig = { ...defaultConfig, plugins: [ fakePath ] };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadPlugins();

        expect(testObject.loadedModules.find(x => x.endsWith('fakePlugin.ts'))).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBe(FakePlugin);
        const testCheck = testObject.contentPlugins.find(p => p.class === FakePlugin);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.name).toBe('FakePlugin');
        expect(testCheck?.group).toBe('fakePages');
        expect(testCheck?.pattern).toBe('**/*.fake');
    });
});

describe('loadViews() tests', () => {
    test('Succeeds if config.views is empty', async () => {
        const testConfig = { ...defaultConfig, views: '' };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadViews();
    });

    test('Loads views from config.views', async () => {
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakePath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadViews();

        expect(Object.keys(testObject.views).length).toBe(3);
        expect(testObject.views['firstFakeView.ts']).toBeTruthy();
        expect(testObject.views['firstFakeView.ts']).toBeInstanceOf(Function);
        expect(testObject.views['secondFakeView.ts']).toBeTruthy();
        expect(testObject.views['secondFakeView.ts']).toBeInstanceOf(Function);
    });

    test('Loading custom views does not remove the default "none" view', async () => {
        const fakePath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakePath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.loadViews();

        expect(testObject.views.none).toBeTruthy();
        expect(testObject.views.none).toBeInstanceOf(Function);
    });
});

describe('getContents() tests', () => {
    test('Loads content tree from files', async () => {
        const testTree = getFakeTree('testTree');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => testTree);
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        const testOutput = await testObject.getContents();

        expectEquivalentTrees(getFakeTree(''), testOutput, true, true);
    });

    test('Calls all generators', async () => {
        const startingTree = new ContentTree('empty');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen1'))
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen2'))
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        await testObject.getContents();

        expect(vi.mocked(runGenerator)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator1);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator2);
    });

    test('Includes content loaded from generators in tree', async () => {
        const startingTree = new ContentTree('start');
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        const testOutput = await testObject.getContents();

        expect(testOutput['top.jpg']).toBeTruthy();
        expect(testOutput['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((testOutput['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(testOutput['dir']).toBeTruthy();
        expect(testOutput['dir']).toBeInstanceOf(ContentTree);
        expect(testOutput['dir']['file.md']).toBeTruthy();
        expect(testOutput['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((testOutput['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
    });

    test('Merges content from files and content from generators', async () => {
        const startingTree = new ContentTree('start');
        startingTree['static.file'] = new FakePlugin('static.file', undefined, startingTree);
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        const testOutput = await testObject.getContents();

        expect(testOutput['top.jpg']).toBeTruthy();
        expect(testOutput['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((testOutput['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(testOutput['dir']).toBeTruthy();
        expect(testOutput['dir']).toBeInstanceOf(ContentTree);
        expect(testOutput['dir']['file.md']).toBeTruthy();
        expect(testOutput['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((testOutput['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
        expect(testOutput['static.file']).toBeTruthy();
        expect(testOutput['static.file']).toBeInstanceOf(FakePlugin);
        expect((testOutput['static.file'] as ContentPlugin).__filename).toBe('static.file');
    });
});

describe('getLocals() tests', () => {
    test('Returns this.locals asynchronously', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = { someLocalProperty: 'yes' };
        testObject.locals = expectedOutput;

        const testOutput = await testObject.getLocals();

        expect(testOutput).toStrictEqual(expectedOutput);
    });
});

describe('getTemplates() tests', () => {
    test('Calls loadTemplates()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        
        await testObject.getTemplates();

        expect(loadTemplates).toHaveBeenCalledOnce();
        expect(loadTemplates).toHaveBeenLastCalledWith(testObject);
    });

    test('Returns result of loadTemplates() call', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = {};
        vi.mocked(loadTemplates).mockImplementation(async () => expectedOutput);
        
        const testOutput = await testObject.getTemplates();

        expect(testOutput).toBe(expectedOutput);
    });
});

describe('load() tests', () => {
    test('Loads MarkdownPage plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

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

        await testObject.load();

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

        await testObject.load();

        expect(testObject.loadedModules.find(x => x.endsWith('page.ts'))).toBeTruthy();
        expect(testObject.plugins.Page).toBeTruthy();
        expect(testObject.plugins.Page).toBe(Page);
        expect(testObject.views.template).toBeInstanceOf(Function);
    });

    test('Loads PugTemplate plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

        expect(testObject.loadedModules.find(x => x.endsWith('pug.ts'))).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBe(PugTemplate);
        const testCheck = testObject.templatePlugins.find(p => p.class === PugTemplate);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.pattern).toBe('**/*.*(pug|jade)');
    });

    test('Loads plugin listed in config object', async () => {
        const fakePluginPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');
        const testConfig = { ...defaultConfig, plugins: [ fakePluginPath ] };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

        expect(testObject.loadedModules.find(x => x.endsWith('fakePlugin.ts'))).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBe(FakePlugin);
        const testCheck = testObject.contentPlugins.find(p => p.class === FakePlugin);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.name).toBe('FakePlugin');
        expect(testCheck?.group).toBe('fakePages');
        expect(testCheck?.pattern).toBe('**/*.fake');
    });

    test('Succeeds if config.views is empty', async () => {
        const testConfig = { ...defaultConfig, views: '' };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();
    });

    test('Loads views from config.views', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

        expect(Object.keys(testObject.views).length).toBe(4);
        expect(testObject.views['firstFakeView.ts']).toBeTruthy();
        expect(testObject.views['firstFakeView.ts']).toBeInstanceOf(Function);
        expect(testObject.views['secondFakeView.ts']).toBeTruthy();
        expect(testObject.views['secondFakeView.ts']).toBeInstanceOf(Function);
    });

    test('Loading custom views does not remove the default "none" view', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

        expect(testObject.views.none).toBeTruthy();
        expect(testObject.views.none).toBeInstanceOf(Function);
    });

    test('Loading custom views does not remove the default "template" view created by the Page plugin', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.load();

        expect(testObject.views.template).toBeTruthy();
        expect(testObject.views.template).toBeInstanceOf(Function);
    });

    test('Loads content tree from files', async () => {
        const testTree = getFakeTree('testTree');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => testTree);
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        const testOutput = await testObject.load();

        expectEquivalentTrees(getFakeTree('', ['pages']), testOutput.contents, true, true);
    }); 

    test('Calls all generators', async () => {
        const startingTree = new ContentTree('empty');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen1'))
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen2'))
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        await testObject.load();

        expect(vi.mocked(runGenerator)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator1);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator2);
    });

    test('Includes content loaded from generators in tree', async () => {
        const startingTree = new ContentTree('start');
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        const testOutput = await testObject.load();

        expect(testOutput.contents['top.jpg']).toBeTruthy();
        expect(testOutput.contents['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((testOutput.contents['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(testOutput.contents['dir']).toBeTruthy();
        expect(testOutput.contents['dir']).toBeInstanceOf(ContentTree);
        expect(testOutput.contents['dir']['file.md']).toBeTruthy();
        expect(testOutput.contents['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((testOutput.contents['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
    });

    test('Merges content from files and content from generators', async () => {
        const startingTree = new ContentTree('start');
        startingTree['static.file'] = new FakePlugin('static.file', undefined, startingTree);
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        const testOutput = await testObject.load();

        expect(testOutput.contents['top.jpg']).toBeTruthy();
        expect(testOutput.contents['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((testOutput.contents['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(testOutput.contents['dir']).toBeTruthy();
        expect(testOutput.contents['dir']).toBeInstanceOf(ContentTree);
        expect(testOutput.contents['dir']['file.md']).toBeTruthy();
        expect(testOutput.contents['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((testOutput.contents['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
        expect(testOutput.contents['static.file']).toBeTruthy();
        expect(testOutput.contents['static.file']).toBeInstanceOf(FakePlugin);
        expect((testOutput.contents['static.file'] as ContentPlugin).__filename).toBe('static.file');
    });

    test('Calls loadTemplates()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        
        await testObject.load();

        expect(loadTemplates).toHaveBeenCalledOnce();
        expect(loadTemplates).toHaveBeenLastCalledWith(testObject);
    });

    test('Returns result of loadTemplates() call', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = {};
        vi.mocked(loadTemplates).mockImplementation(async () => expectedOutput);
        
        const testOutput = await testObject.load();

        expect(testOutput.templates).toBe(expectedOutput);
    });

    test('Returns this.locals', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = { someLocalProperty: 'yes' };
        testObject.locals = expectedOutput;

        const testOutput = await testObject.load();

        expect(testOutput.locals).toStrictEqual(expectedOutput);
    });
});

describe('preview() tests', () => {
    test('Sets mode to preview', async () => {
        const mockRun = vi.fn(() => Promise.resolve(createServer()));
        vi.doMock('../../core/server', async (orig) => {
            const serverModule = await orig<typeof import('../../core/server')>();
            return {
                ...serverModule,
                run: mockRun
            };
        });
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.preview();

        expect(testObject.mode).toBe('preview');
    });

    test('Calls server.run()', async () => {
        const mockRun = vi.fn(() => Promise.resolve(createServer()));
        vi.doMock('../../core/server', async (orig) => {
            const serverModule = await orig<typeof import('../../core/server')>();
            return {
                ...serverModule,
                run: mockRun
            };
        });
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.preview();

        expect(mockRun).toHaveBeenCalledOnce();
        expect(mockRun).toHaveBeenLastCalledWith(testObject);
    });
});

describe('build() tests', () => {
    test('Sets mode to build', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(testObject.mode).toBe('build');
    });

    test('Loads MarkdownPage plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

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

        await testObject.build();

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

        await testObject.build();

        expect(testObject.loadedModules.find(x => x.endsWith('page.ts'))).toBeTruthy();
        expect(testObject.plugins.Page).toBeTruthy();
        expect(testObject.plugins.Page).toBe(Page);
        expect(testObject.views.template).toBeInstanceOf(Function);
    });

    test('Loads PugTemplate plugin', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(testObject.loadedModules.find(x => x.endsWith('pug.ts'))).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBeTruthy();
        expect(testObject.plugins.PugTemplate).toBe(PugTemplate);
        const testCheck = testObject.templatePlugins.find(p => p.class === PugTemplate);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.pattern).toBe('**/*.*(pug|jade)');
    });

    test('Loads plugin listed in config object', async () => {
        const fakePluginPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/fakePlugin.ts');
        const testConfig = { ...defaultConfig, plugins: [ fakePluginPath ] };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(testObject.loadedModules.find(x => x.endsWith('fakePlugin.ts'))).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBeTruthy();
        expect(testObject.plugins.FakePlugin).toBe(FakePlugin);
        const testCheck = testObject.contentPlugins.find(p => p.class === FakePlugin);
        expect(testCheck).toBeTruthy();
        expect(testCheck?.name).toBe('FakePlugin');
        expect(testCheck?.group).toBe('fakePages');
        expect(testCheck?.pattern).toBe('**/*.fake');
    });

    test('Succeeds if config.views is empty', async () => {
        const testConfig = { ...defaultConfig, views: '' };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();
    });

    test('Loads views from config.views', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(Object.keys(testObject.views).length).toBe(4);
        expect(testObject.views['firstFakeView.ts']).toBeTruthy();
        expect(testObject.views['firstFakeView.ts']).toBeInstanceOf(Function);
        expect(testObject.views['secondFakeView.ts']).toBeTruthy();
        expect(testObject.views['secondFakeView.ts']).toBeInstanceOf(Function);
    });

    test('Loading custom views does not remove the default "none" view', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(testObject.views.none).toBeTruthy();
        expect(testObject.views.none).toBeInstanceOf(Function);
    });

    test('Loading custom views does not remove the default "template" view created by the Page plugin', async () => {
        const fakeViewPath = path.resolve(url.fileURLToPath(import.meta.url), '../fakes/views');
        const testConfig = { ...defaultConfig, views: fakeViewPath };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(testObject.views.template).toBeTruthy();
        expect(testObject.views.template).toBeInstanceOf(Function);
    });

    test('Calls all generators', async () => {
        const startingTree = new ContentTree('empty');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen1'))
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => new ContentTree('gen2'))
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        await testObject.build();

        expect(vi.mocked(runGenerator)).toHaveBeenCalledTimes(2);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator1);
        expect(vi.mocked(runGenerator)).toHaveBeenCalledWith(testObject, startingTree, testGenerator2);
    });

    test('Calls loadTemplates()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        
        await testObject.build();

        expect(loadTemplates).toHaveBeenCalledOnce();
        expect(loadTemplates).toHaveBeenLastCalledWith(testObject);
    });

    test('Calls render()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(vi.mocked(render)).toHaveBeenCalledOnce();
    });

    test('Passes this to render()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(vi.mocked(render).mock.lastCall?.[0]).toBe(testObject);
    });

    test('If called with parameter, passes parameter to render()', async () => {
        const expectedResult = 'altBuildDir';
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build(expectedResult);

        expect(vi.mocked(render).mock.lastCall?.[1]).toBe(expectedResult);
    });

    test('If called without parameter, passes resolved value of config.output to constructor to render()', async () => {
        const testConfig = { ...defaultConfig, output: 'configuredBuildDir' };
        const expectedResult = path.resolve('testDir', testConfig.output);
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        expect(vi.mocked(render).mock.lastCall?.[1]).toBe(expectedResult);
    });

    test('Loads content tree from files  before passing tree to render()', async () => {
        const testTree = getFakeTree('testTree');
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => testTree);
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);

        await testObject.build();

        const loadedTree = vi.mocked(render).mock.lastCall?.[2] as IContentTree;
        expectEquivalentTrees(getFakeTree('', ['pages']), loadedTree, true, true);
    }); 

    test('Includes content loaded from generators in tree before passing tree to render()', async () => {
        const startingTree = new ContentTree('start');
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        await testObject.build();

        const finalTree = vi.mocked(render).mock.lastCall?.[2] as IContentTree;
        expect(finalTree['top.jpg']).toBeTruthy();
        expect(finalTree['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((finalTree['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(finalTree['dir']).toBeTruthy();
        expect(finalTree['dir']).toBeInstanceOf(ContentTree);
        expect(finalTree['dir']['file.md']).toBeTruthy();
        expect(finalTree['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((finalTree['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
    });

    test('Merges content from files and content from generators before passing tree to render()', async () => {
        const startingTree = new ContentTree('start');
        startingTree['static.file'] = new FakePlugin('static.file', undefined, startingTree);
        const gen1Tree = new ContentTree('gen1');
        gen1Tree['dir'] = new ContentTree('dir');
        gen1Tree['dir'].parent = gen1Tree;
        gen1Tree['dir']['file.md'] = new FakePlugin('file.md', undefined, gen1Tree['dir']);
        const gen2Tree = new ContentTree('gen2');
        gen2Tree['top.jpg'] = new FakePlugin('top.jpg', undefined, gen2Tree);
        vi.mocked(ContentTree.fromDirectory).mockImplementation(async () => startingTree);
        vi.mocked(runGenerator).mockImplementation(async (env, tree, gendef: GeneratorDef) => await gendef.fn(tree));
        const testGenerator1 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen1Tree)
        };
        const testGenerator2 = {
            name: 'test1',
            group: 'mocks',
            fn: vi.fn(async () => gen2Tree)
        };
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        testObject.generators.push(testGenerator1, testGenerator2);

        await testObject.build();

        const finalTree = vi.mocked(render).mock.lastCall?.[2] as IContentTree;
        expect(finalTree['top.jpg']).toBeTruthy();
        expect(finalTree['top.jpg']).toBeInstanceOf(FakePlugin);
        expect((finalTree['top.jpg'] as ContentPlugin).__filename).toBe('top.jpg');
        expect(finalTree['dir']).toBeTruthy();
        expect(finalTree['dir']).toBeInstanceOf(ContentTree);
        expect(finalTree['dir']['file.md']).toBeTruthy();
        expect(finalTree['dir']['file.md']).toBeInstanceOf(FakePlugin);
        expect((finalTree['dir']['file.md'] as ContentPlugin).__filename).toBe('file.md');
        expect(finalTree['static.file']).toBeTruthy();
        expect(finalTree['static.file']).toBeInstanceOf(FakePlugin);
        expect((finalTree['static.file'] as ContentPlugin).__filename).toBe('static.file');
    });

    test('Passes templates to render()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = {};
        vi.mocked(loadTemplates).mockImplementation(async () => expectedOutput);
        
        await testObject.build();

        expect(vi.mocked(render).mock.lastCall?.[3]).toBe(expectedOutput);
    });

    test('Passes locals to render()', async () => {
        const testConfig = { ...defaultConfig };
        const testObject = await Environment.factory(testConfig, 'testDir', testLogger);
        const expectedOutput = { someLocalProperty: 'yes' };
        testObject.locals = expectedOutput;

        await testObject.build();

        expect(vi.mocked(render).mock.lastCall?.[4]).toStrictEqual(expectedOutput);
    });
});
