import { describe, expect, test, vi } from 'vitest';

import StaticFile, { defaultPluginDef } from '../../core/staticFile';
import { ReadStream, createReadStream } from 'fs';
import { Readable } from 'node:stream';

vi.mock('node:fs');

describe('StaticFile tests', () => {
    test('Constructor sets filepath property', () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        
        const testObject = new StaticFile(testpath);

        expect(testObject.filepath).toStrictEqual(testpath);
    });

    test('name returns StaticFile', () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        
        const testObject = new StaticFile(testpath);

        expect(testObject.name).toBe('StaticFile');
    });

    test('view returns function that readable stream of file if call to fs.createReadStream() succeeds', async () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        const testObject = new StaticFile(testpath);
        const expectedOutput = Readable.from('File content');
        vi.mocked(createReadStream).mockImplementation(() => expectedOutput as ReadStream);

        const testViewFunc = testObject.view;
        const testOutput = await testViewFunc();
        expect(createReadStream).toHaveBeenCalledOnce();
        expect(createReadStream).toHaveBeenLastCalledWith('/test/testpath');
        expect(testOutput).toBe(expectedOutput);
    });

    test('view returns function that throws error if call to fs.createReadStream() fails', async () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        const testObject = new StaticFile(testpath);
        vi.mocked(createReadStream).mockImplementation(() => { throw new Error('Mock operation failed successfully'); });

        const testViewFunc = testObject.view;
        await expect(async () => await testViewFunc()).rejects.toThrowError();
    });
    
    test('filename returns filepath.relative', () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        const testObject = new StaticFile(testpath);

        expect(testObject.filename).toBe('./testpath');
    });

    test('plugincolour returns none', () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        const testObject = new StaticFile(testpath);

        expect(testObject.pluginColour).toBe('none');
    });

    test('fromFile() returns object with correct filepath property', async () => {
        const testpath = { full: '/test/testpath', relative: './testpath' };
        
        const testOutput = await StaticFile.fromFile(testpath);

        expect(testOutput.filepath).toStrictEqual(testpath);
    });
});

describe('defaultPluginDef tests', () => {
    test('name property is StaticFile', () => {
        expect(defaultPluginDef.name).toBe('StaticFile');
    });

    test('group property is files', () => {
        expect(defaultPluginDef.group).toBe('files');
    });

    test('pattern property is empty', () => {
        expect(defaultPluginDef.pattern).toBe('');
    });

    test('class property is StaticFile constructor', () => {
        expect(defaultPluginDef.class).toBe(StaticFile);
    });
});
