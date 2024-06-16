import { describe, expect, test } from 'vitest';
import * as winston from 'winston';

import Environment from '../../core/environment';
import { defaultConfig } from '../../core/config';
import { transports } from '../../core/logger';

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

    test.todo('workdir property is set to second parameter');
    test.todo('logger property is set to third parameter');
    test.todo('helpers property is empty');
    test.todo('loadedModules property is empty');
    test.todo('contentsPath property is set to config.content');
    test.todo('templatesPath property is set to config.templates');
    test.todo('views property contains the none view');
    test.todo('views property only contains one view');
    test.todo('generators property is empty');
    test.todo('plugins property contains StatisFile');
    test.todo('plugins property only contains StaticFile');
    test.todo('templatePlugins property is empty');
    test.todo('contentPlugins property is empty');
    test.todo('locals property is empty if config.locals is empty, config.imports is empty and config.require is empty');
    test.todo('locals property contains data set in config.locals if config.locals is an object');
    test.todo('locals property contains data loaded from the file named in config.locals if config.locals is a string');
    test.todo('locals property contains modules listed in config.imports');
    test.todo('locals property contains modules listed in config.require');
});

describe('reset() tests', () => {
    test.todo('helpers property is empty');
    test.todo('views property contains the none view');
    test.todo('views property only contains one view');
    test.todo('generators property is empty');
    test.todo('plugins property contains StatisFile');
    test.todo('plugins property only contains StaticFile');
    test.todo('templatePlugins property is empty');
    test.todo('contentPlugins property is empty');
    test.todo('locals property is empty if config.locals is empty');
    test.todo('locals property contains modules set in config.locals');
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

