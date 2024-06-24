import { describe, expect, test } from 'vitest';
import * as winston from 'winston';
import * as url from 'node:url';
import * as path from 'node:path';

import Environment from '../../core/environment';
import { defaultConfig } from '../../core/config';
import { transports } from '../../core/logger';
import StaticFile from '../../core/staticFile';
import { TestContext } from 'node:test';
import { FakePlugin } from './fakes/fakePlugin';
import FakeTemplate from './fakes/fakeTemplate';

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
    test.todo('config property is set');
    test.todo('contentsPath property is set');
    test.todo('templatesPath property is set');
});

describe('setupLocals() tests', () => {
    test.todo('locals property is empty if config.locals is empty, config.imports is empty and config.require is empty');
    test.todo('locals property contains data set in config.locals if config.locals is an object');
    test.todo('locals property contains data loaded from the file named in config.locals if config.locals is a string');
    test.todo('locals property contains modules listed in config.imports');
    test.todo('locals property contains modules listed in config.require');
});

describe('registerContentPlugin() tests', () => {
    test.todo('Adds plugin constructor to plugins');
    test.todo('Adds correct plugin definition to contentPlugins');
});

describe('registerTemplatePlugin() tests', () => {
    test.todo('Adds plugin constructor to plugins');
    test.todo('Adds correct plugin definition to templatePlugins');
});

describe('registerGenerator() tests', () => {
    test.todo('Adds correct generator definition to generators if called with two parameters');
    test.todo('Adds correct generator definition to generators if called with three parameters');
});

describe('registerView() tests', () => {
    test.todo('Adds view to views correctly');
});

describe('getContentGroups() tests', () => {
    test.todo('Returns all groups defined by content plugins');
    test.todo('Returns all groups defined by generators');
    test.todo('Returns unique set of groups');
});

describe('loadModule() tests', () => {
    test.todo('Adds module to loadedModules');
    test.todo('Returns imported module');
});

