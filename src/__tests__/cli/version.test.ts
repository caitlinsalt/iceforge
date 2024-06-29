import { describe, expect, test, vi } from  'vitest';

import { readJson } from '../../core/utils';
import version from '../../cli/version'; 

vi.mock('../../core/utils');

describe('version() tests', () => {
    test('tries to read a package.json file', async () => {
        vi.mocked(readJson).mockImplementation(async () => ({ version: '2.5.1' }));

        await version();

        expect(vi.mocked(readJson)).toHaveBeenCalledOnce();
        expect(vi.mocked(readJson).mock.lastCall?.[0].endsWith('package.json')).toBeTruthy();
    });

    test('returns the package.json version field', async () => {
        const expectedOutput = '2.5.1';
        vi.mocked(readJson).mockImplementation(async () => ({ version: expectedOutput }));

        const testOutput = await version();

        expect(testOutput).toBe(expectedOutput);
    });
});
