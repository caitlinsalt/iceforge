import { describe, expect, test, vi } from 'vitest';
import Config, { defaultConfig } from '../../core/config.js';
import * as utils from '../../core/utils.js';

vi.mock('../../core/utils.js');

describe('Config constructor tests', () => {
    test('Constructor with no parameters sets default options', () => {
        const testOutput = new Config();

        expect(testOutput.contents).toBe('./contents');
        expect(testOutput.ignore).toStrictEqual([]);
        expect(testOutput.locals).toStrictEqual({});
        expect(testOutput.plugins).toStrictEqual([]);
        expect(testOutput.imports).toStrictEqual({});
        expect(testOutput.filename).toBe(null);
        expect(testOutput.templates).toBe('./templates');
        expect(testOutput.views).toBe(null);
        expect(testOutput.output).toBe('./build');
        expect(testOutput.baseUrl).toBe('/');
        expect(testOutput.hostname).toBe(null);
        expect(testOutput.port).toBe(8080);
        expect(testOutput.restartOnConfigChange).toBe(true);
    });

    test('Constructor with parameter overrides defaults with values from parameter', () => {
        const testInput = {
            ...defaultConfig,
            templates: 'testVal',
            require: { module: 'theModule' },
            baseUrl: 'blog'
        };

        const testOutput = new Config(testInput);

        expect(testOutput.contents).toBe('./contents');
        expect(testOutput.ignore).toStrictEqual([]);
        expect(testOutput.locals).toStrictEqual({});
        expect(testOutput.plugins).toStrictEqual([]);
        expect(testOutput.imports).toStrictEqual({});
        expect(testOutput.require).toStrictEqual({ module: 'theModule' });
        expect(testOutput.filename).toBe(null);
        expect(testOutput.templates).toBe('testVal');
        expect(testOutput.views).toBe(null);
        expect(testOutput.output).toBe('./build');
        expect(testOutput.baseUrl).toBe('blog');
        expect(testOutput.hostname).toBe(null);
        expect(testOutput.port).toBe(8080);
        expect(testOutput.restartOnConfigChange).toBe(true);
    });
});

describe('Config.fromFile tests', () => {
    test('fromFile throws error if file does not exist', async () => {
        vi.mocked(utils.fileExists).mockResolvedValue(false);

        await expect(() => Config.fromFile('example')).rejects.toThrowError();
    });

    test('fromFile sets filename property to output to parameter', async () => {
        const testInput = {
            ...defaultConfig,
            templates: 'testVal',
            require: { module: 'theModule' },
            baseUrl: 'blog'
        };

        vi.mocked(utils.fileExists).mockResolvedValue(true);
        vi.mocked(utils.readJson).mockResolvedValue(testInput);

        const testOutput = await Config.fromFile('example');

        expect(testOutput.filename).toBe('example');
    });
});
