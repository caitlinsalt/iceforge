import { afterEach, describe, expect, test, vi } from 'vitest';
import * as path from 'node:path';

import { commonOptions, commonUsage, extendOptions, getStoragePath, loadEnv } from '../../cli/common';
import Environment from '../../core/environment';
import { fileExists } from '../../core/utils';
import { FakeEnvironment } from '../core/fakes/fakeEnvironment';
import Config, { defaultConfig } from '../../core/config';
import { IConfig } from '../../core/coreTypes';

vi.mock('../../core/utils');
vi.mock('../../core/environment', async (imp) => {
    const orig = await imp<typeof import('../../core/environment')>();
    orig.default.create = vi.fn(() => Promise.resolve(new FakeEnvironment() as unknown as Environment));
    return orig;
});
vi.mock('../../core/config', async (imp) => {
    const orig = await imp<typeof import('../../core/config')>();
    orig.default.fromFile = vi.fn(async () => new orig.default());
    return orig;
});

afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
});

const standardTestOptions = { ...commonOptions.default, _: [] };

describe('commonOptions tests', () => {
    test('commonOptions is defined', () => {
        expect(commonOptions).toBeTruthy();
    });
});

describe('commonUsage tests', () => {
    test('commonUsage is defined', () => {
        expect(commonUsage).toBeTruthy();
        expect(commonUsage.startsWith('-C')).toBeTruthy();
    });
});

describe('extendOptions() tests', () => {
    test('extendOptions() merges string property of second parameter into first', () => {
        const testParameterOne = { string: [ 'a', 'b', 'c'], boolean: [], alias: {}, default: {} };
        const testParameterTwo = { string: [ 'd', 'e' ], boolean: [], alias: {}, default: {}  };
        const expectedResult = { string: [ 'a', 'b', 'c', 'd', 'e' ], boolean: [], alias: {}, default: {}  };

        extendOptions(testParameterOne, testParameterTwo);

        expect(testParameterOne).toStrictEqual(expectedResult);
    });

    test('extendOptions() merges boolean property of second parameter into first', () => {
        const testParameterOne = { boolean: [ 'ex', 'why' ], string: [], alias: {}, default: {} };
        const testParameterTwo = { boolean: [ 'zed' ], string: [], alias: {}, default: {} };
        const expectedResult = { boolean: [ 'ex', 'why', 'zed' ], string: [], alias: {}, default: {} };

        extendOptions(testParameterOne, testParameterTwo);

        expect(testParameterOne).toStrictEqual(expectedResult);
    });

    test('extendOptions() merges alias property of second parameter into first', () => {
        const testParameterOne = { alias: { x: 'ex', y: 'why' }, boolean: [], string: [], default: {} };
        const testParameterTwo = { alias: { z: 'zed' }, boolean: [], string: [], default: {} };
        const expectedResult = { alias: { x: 'ex', y: 'why', z: 'zed' }, boolean: [], string: [], default: {} };

        extendOptions(testParameterOne, testParameterTwo);
        
        expect(testParameterOne).toStrictEqual(expectedResult);
    });

    test('extendOptions() merges default property of second parameter into first', () => {
        const testParameterOne = { default: { x: 1, b: 'val', c: 'yes' }, boolean: [], string: [], alias: {} };
        const testParameterTwo = { default: { a: true, z: 'end' }, boolean: [], string: [], alias: {} };
        const expectedResult = { default: { a: true, b: 'val', c: 'yes', x: 1, z: 'end'}, boolean: [], string: [], alias: {} };

        extendOptions(testParameterOne, testParameterTwo);
        
        expect(testParameterOne).toStrictEqual(expectedResult);
    });
});

describe('loadEnv() tests', () => {
    describe('loadEnv() selects correct working directory...', () => {
        test('...if chdir option is set', async () => {
            vi.mocked(fileExists).mockImplementation(async () => false);
            const expectedResult = 'testDir';
            const testParameter = { ...standardTestOptions, chdir: expectedResult };

            await loadEnv(testParameter);

            expect(Environment.create).toHaveBeenCalled();
            expect(vi.mocked(Environment.create).mock.lastCall?.[1]?.endsWith(expectedResult)).toBeTruthy();
        });

        test('...if chdir option is not set', async () => {
            vi.mocked(fileExists).mockImplementation(async () => false);
            const expectedResult = process.cwd();
            const testParameter = { ...standardTestOptions, chdir: '' };

            await loadEnv(testParameter);

            expect(Environment.create).toHaveBeenCalled();
            expect(vi.mocked(Environment.create).mock.lastCall?.[1]).toBe(expectedResult);
        });
    });

    describe('loadEnv() looks for config in correct location...', () => {
        test('...if chddir option is set', async () => {
            vi.mocked(fileExists).mockImplementation(async () => false);
            const testParameter = { ...standardTestOptions, chdir: 'testDir', config: 'test.config' };
            const expectedResult = `testDir${path.sep}test.config`;

            await loadEnv(testParameter);

            expect(fileExists).toHaveBeenCalled();
            expect(vi.mocked(fileExists).mock.lastCall?.[0].endsWith(expectedResult)).toBeTruthy();
        });

        test('...if chdir option is not set', async () => {
            vi.mocked(fileExists).mockImplementation(async () => false);
            const testParameter = { ...standardTestOptions, chdir: '', config: 'test.config' };
            const expectedResult = `${process.cwd()}${path.sep}test.config`;

            await loadEnv(testParameter);

            expect(fileExists).toHaveBeenCalled();
            expect(vi.mocked(fileExists).mock.lastCall?.[0]).toBe(expectedResult);
        });
    });

    test('loadEnv() loads config from selected file if it exists', async () => {
        vi.mocked(fileExists).mockImplementation(async () => true);
        const expectedConfig = new Config();
        vi.mocked(Config.fromFile).mockImplementation(async () => expectedConfig);
        const testParameter = { ...standardTestOptions, config: 'test.config' };

        await loadEnv(testParameter);

        expect(Config.fromFile).toHaveBeenCalledOnce();
        expect(vi.mocked(Config.fromFile).mock.lastCall?.[0].endsWith('test.config')).toBeTruthy();
        expect(vi.mocked(Environment.create).mock.lastCall?.[0]).toBe(expectedConfig);
    });

    test('loadEnv() uses default config if selected file does not exist', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const testParameter = { ...standardTestOptions };

        await loadEnv(testParameter);

        expect(Config.fromFile).not.toHaveBeenCalled();
        expect(vi.mocked(Environment.create).mock.lastCall?.[0]).toStrictEqual(new Config(defaultConfig));
    });

    test('If port option is set, loadEnv() overrides value in config file', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const expectedValue = 4472;
        const testParameter = { ...standardTestOptions, port: expectedValue };

        await loadEnv(testParameter);

        expect((vi.mocked(Environment.create).mock.lastCall?.[0] as IConfig).port).toBe(expectedValue);
    });

    test('If ignore option is set, loadEnv() overrides value in config file', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const expectedValue = [ 'Test', 'ignored' ];
        const testParameter = { ...standardTestOptions, ignore: 'Test,ignored' };

        await loadEnv(testParameter);

        expect((vi.mocked(Environment.create).mock.lastCall?.[0] as IConfig).ignore).toStrictEqual(expectedValue);
    });

    test('If imports option is set, loadEnv() overrides value in config file', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const expectedValue = { test: 'module', alias: 'this', noalias: 'noalias' };
        const testParameter = { ...standardTestOptions, imports: 'test:module,alias:this,noalias' };

        await loadEnv(testParameter);

        expect((vi.mocked(Environment.create).mock.lastCall?.[0] as IConfig).imports).toStrictEqual(expectedValue);
    });

    test('If require option is set, loadEnv() overrides value in config file', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const expectedValue = { test: 'module', alias: 'this', noalias: 'noalias' };
        const testParameter = { ...standardTestOptions, require: 'test:module,alias:this,noalias' };

        await loadEnv(testParameter);

        expect((vi.mocked(Environment.create).mock.lastCall?.[0] as IConfig).require).toStrictEqual(expectedValue);
    });

    test('If plugins option is set, loadEnv() overrides value in config file', async () => {
        vi.mocked(fileExists).mockImplementation(async () => false);
        const expectedValue = [ 'a', 'b', 'c' ];
        const testParameter = { ...standardTestOptions, plugins: 'a,b,c' };

        await loadEnv(testParameter);

        expect((vi.mocked(Environment.create).mock.lastCall?.[0] as IConfig).plugins).toStrictEqual(expectedValue);
    });

    test('loadEnv() returns result of Environment.create()', async () => {
        const expectedResult = new FakeEnvironment();
        vi.mocked(Environment.create).mockImplementation(async () => expectedResult as unknown as Environment);
        const testParameter = { ...standardTestOptions };

        const testOutput = await loadEnv(testParameter);

        expect(testOutput).toBe(expectedResult);
    });
});

describe('getStoragePath() tests', () => {
    test('Returns ICEFORGE_PATH environment variable if it is set', () => {
        const expectedResult = '.testPath';
        vi.stubEnv('ICEFORGE_PATH', expectedResult);

        const testOutput = getStoragePath();

        expect(testOutput).toBe(expectedResult);
    });

    describe('If $ICEFORGE_PATH is not set...', () => {
        test('...getStoragePath() returns $HOME/.iceforge if $HOME is set', () => {
            const expectedResult = `home${path.sep}.iceforge`;
            vi.stubEnv('HOME', 'home');
            vi.stubEnv('ICEFORGE_PATH', '');
            
            const testOutput = getStoragePath();

            expect(testOutput.endsWith(expectedResult)).toBeTruthy();
        });

        test('...getStoragePath() returns $USERPROFILE/.iceforge if $HOME is not set', () => {
            const expectedResult = `home${path.sep}.iceforge`;
            vi.stubEnv('HOME', '');
            vi.stubEnv('USERPROFILE', 'home');
            vi.stubEnv('ICEFORGE_PATH', '');
            
            const testOutput = getStoragePath();

            expect(testOutput.endsWith(expectedResult)).toBeTruthy();
        });
    });
});
