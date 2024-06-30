import { beforeEach, describe, expect, test, vi } from 'vitest';
import { access, constants, readdir, readFile, stat } from 'node:fs/promises';
import { BigIntStats, Dirent, PathLike, Stats } from 'node:fs';
import * as path from 'node:path';

import { fileExists, readDirRecursive, readJson, rfc2822, rfc822, stripExtension } from '../../core/utils';

vi.mock('node:fs/promises');

beforeEach(() => {
    vi.resetAllMocks();
});

describe('stripExtension() tests', () => {
    test('Strip extension from bare filename', () => {
        const testInput = 'test.input.file';
        const expectedOutput = 'test.input';

        const testOutput = stripExtension(testInput);

        expect(testOutput).toBe(expectedOutput);
    });

    test('Do not alter filename without extension', () => {
        const testInput = 'testInput';
        const expectedOutput = 'testInput';

        const testOutput = stripExtension(testInput);

        expect(testOutput).toBe(expectedOutput);
    });

    test('Strip extension from dotfile', () => {
        const testInput = '.testInput.file';
        const expectedOutput = '.testInput';

        const testOutput = stripExtension(testInput);

        expect(testOutput).toBe(expectedOutput);
    });

    test('Do not alter dotfile name without extension', () => {
        const testInput = '.testInput';
        const expectedOutput = '.testInput';

        const testOutput = stripExtension(testInput);

        expect(testOutput).toBe(expectedOutput);
    });
});

describe('readJson() tests', () => {
    test('Returns data from file', async () => {
        const expectedOutput = { test: 'value', thisIsAGoodTest: true };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from(`{
    "test": "value",
    "thisIsAGoodTest": true
}`));

        const testOutput = await readJson('testFile');

        expect(readFile).toBeCalledWith('testFile');
        expect(testOutput).toStrictEqual(expectedOutput);
    });

    test('Throws error if fs.readFile() throws error', async () => {
        vi.mocked(readFile).mockImplementation(async () => {
            throw new Error('Mock error');
        });

        await expect(async () => await readJson('testFile')).rejects.toThrowError();
    });

    test('Throws error if file contains invalid JSON', async () => {
        vi.mocked(readFile).mockImplementation(async () => Buffer.from('This is not valid JSON'));

        await expect(async () => await readJson('testFile')).rejects.toThrowError();
    });
});

describe('fileExists() tests', () => {
    test('Returns true if fs.access succeeds', async () => {
        const testPath = 'testpath';
        vi.mocked(access).mockReturnValue(Promise.resolve());

        const testOutput = await fileExists(testPath);

        expect(access).toHaveBeenCalledOnce();
        expect(access).toHaveBeenLastCalledWith(testPath, constants.R_OK);
        expect(testOutput).toBeTruthy();
    });

    test('Returns false if fs.access throws exception', async () => {
        const testPath = 'testpath';
        vi.resetAllMocks();
        vi.mocked(access).mockImplementation(async () => { throw new Error('No such file'); });

        const testOutput = await fileExists(testPath);

        expect(access).toHaveBeenCalledOnce();
        expect(access).toHaveBeenLastCalledWith(testPath, constants.R_OK);
        expect(testOutput).toBeFalsy();
    });
});

describe('readDirRecursive() tests', () => {
    test('Returns flattened directory tree', async () => {
        const mockReaddir: (input: PathLike) => Promise<string[]> & Promise<Dirent[]> = async (input) => {
            switch(input) {
            case 'testRoot':
                return ['firstSubDir', 'secondSubDir', 'testFile', 'testImage', 'testDoc'] as string[] & Dirent[];
            case `testRoot${path.sep}firstSubDir`:
                return ['subFile1', 'subFile2'] as string[] & Dirent[];
            default:
                return [] as string[] & Dirent[];
            }
        };
        const mockStat: (input: PathLike) => Promise<Stats | BigIntStats> = async (name) => {
            const dirs = ['testRoot', `testRoot${path.sep}firstSubDir`, `testRoot${path.sep}secondSubDir`];
            if (dirs.includes(name as string)) {
                return { isDirectory: () => true } as Stats;
            }
            return { isDirectory: () => false } as Stats;
        };
        vi.mocked(readdir).mockImplementation(mockReaddir);
        vi.mocked(stat).mockImplementation(mockStat);

        const testOutput = await readDirRecursive('testRoot');

        expect(testOutput.length).toBe(5);
        expect(testOutput).toContain(`firstSubDir${path.sep}subFile1`);
        expect(testOutput).toContain(`firstSubDir${path.sep}subFile2`);
        expect(testOutput).toContain('testFile');
        expect(testOutput).toContain('testImage');
        expect(testOutput).toContain('testDoc');
    });
});

describe('rfc2822() tests', () => {
    test('Returns date in expected format', () => {
        const testInput = new Date('2024-06-30T14:56:32.000Z');

        const testOutput = rfc2822(testInput);

        expect(testOutput).toBe('Sun, 30 Jun 2024 14:56:32 +0000');
    });
});

describe('rfc822() tests', () => {
    test('Returns date in expected format', () => {
        const testInput = new Date('2024-06-30T14:56:32.000Z');

        const testOutput = rfc822(testInput);

        expect(testOutput).toBe('Sun, 30 Jun 2024 14:56:32 +0000');
    });
});
