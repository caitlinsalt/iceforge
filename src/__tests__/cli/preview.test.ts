import { afterEach, describe, expect, test, vi } from 'vitest';

import preview, { options, usage } from '../../cli/preview';
import { loadEnv } from '../../cli/common';
import { FakeEnvironment } from '../core/fakes/fakeEnvironment';

vi.mock('../../cli/common');

const testOptions = {
    hostname: '',
    chdir: '',
    config: '',
    port: 0,
    require: '',
    _: []
};

afterEach(() => {
    vi.resetAllMocks();
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

describe('preview() tests', () => {
    test('preview uses common.loadEnv() to load environment', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.preview = vi.fn(() => Promise.resolve());
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);

        await preview(testOptions);

        expect(loadEnv).toHaveBeenCalledOnce();
        expect(loadEnv).toHaveBeenLastCalledWith(testOptions);
    });

    test('preview() calls Environment.preview()', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.preview = vi.fn(() => Promise.resolve());
        vi.mocked(loadEnv).mockImplementation(async () => fakeEnvironment);

        await preview(testOptions);

        expect(fakeEnvironment.preview).toHaveBeenCalledOnce();
    });
});
