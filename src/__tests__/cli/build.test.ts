import { afterEach, describe, expect, test, vi } from 'vitest';
import { emptyDir } from 'fs-extra';

import build, { options, usage } from '../../cli/build';
import { loadEnv } from '../../cli/common';
import { FakeEnvironment } from '../core/fakes/fakeEnvironment';
import { fileExists } from '../../core/utils';
import logger from '../../core/logger';


vi.mock('../../cli/common');
vi.mock('../../core/logger');
vi.mock('../../core/utils');
vi.mock('fs-extra');

afterEach(() => {
    vi.resetAllMocks();
});

const getTestOptions = () => ({
    clean: false,
    output: '',
    chdir: '',
    config: '',
    port: 0,
    require: '',
    _: []
});

describe('options and usage tests', () => {
    test('options is defined', () => {
        expect(options).toBeTruthy();
    });

    test('usage is defined', () => {
        expect(usage).toBeTruthy();
        expect(usage.startsWith('\nUsage:')).toBeTruthy();
    });
});

describe('build() tests', () => {
    test('Calls common.loadEnv() to create environment', async () => {
        const fakeEnvironment = new FakeEnvironment();
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        const testOptions = getTestOptions();

        await build(testOptions);

        expect(loadEnv).toHaveBeenCalledOnce();
        expect(loadEnv).toHaveBeenLastCalledWith(testOptions);
    });

    test('If clean option is not set and output directory exists, does not try to clean it', async () => {
        const fakeEnvironment = new FakeEnvironment();
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        const testOptions = getTestOptions();
        testOptions.clean = false;
        vi.mocked(fileExists).mockImplementation(async () => true);

        await build(testOptions);

        expect(emptyDir).not.toHaveBeenCalled();
    });

    test('If clean option is set and output directory exists, tries to clean/create it', async () => {
        const expectedCallParameter = 'outDir';
        const fakeEnvironment = new FakeEnvironment({ output: expectedCallParameter });
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        const testOptions = getTestOptions();
        testOptions.clean = true;
        vi.mocked(fileExists).mockImplementation(async () => true);

        await build(testOptions);

        expect(emptyDir).toHaveBeenCalledOnce();
        expect(emptyDir).toHaveBeenLastCalledWith(expectedCallParameter);
    });

    test('If output directory does not exist, tries to clean/create it', async () => {
        const expectedCallParameter = 'outDir';
        const fakeEnvironment = new FakeEnvironment({ output: expectedCallParameter });
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        const testOptions = getTestOptions();
        vi.mocked(fileExists).mockImplementation(async () => false);

        await build(testOptions);

        expect(emptyDir).toHaveBeenCalledOnce();
        expect(emptyDir).toHaveBeenLastCalledWith(expectedCallParameter);
    });

    test('Calls IEnvironment.build()', async () => {
        const expectedCallParameter = 'outDir';
        const fakeEnvironment = new FakeEnvironment({ output: expectedCallParameter });
        fakeEnvironment.build = vi.fn(() => Promise.resolve());
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        
        await build(getTestOptions());

        expect(fakeEnvironment.build).toHaveBeenCalledOnce();
    });

    test('Logs time taken', async () => {
        const expectedCallParameter = 'outDir';
        const fakeEnvironment = new FakeEnvironment({ output: expectedCallParameter });
        fakeEnvironment.build = vi.fn(() => Promise.resolve());
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);
        
        await build(getTestOptions());

        expect(logger.info).toHaveBeenCalled();
        expect((vi.mocked(logger.info).mock.lastCall?.[0] as unknown as string).startsWith('Done in ')).toBeTruthy();
        expect((vi.mocked(logger.info).mock.lastCall?.[0] as unknown as string).endsWith('ms\n')).toBeTruthy();
    });
});
