import { afterEach, describe, expect, test, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import render, { renderView } from '../../core/render';
import { FakePlugin } from './fakes/fakePlugin';
import ContentTree from '../../core/contentTree';
import { FakeEnvironment } from './fakes/fakeEnvironment';
import FakeWriteable, { FakeFileHandle, fakeWriteables } from './fakes/fakeWriteable';
import { getFakeTree } from '../testUtils';

vi.mock('fs-extra');
vi.mock('node:fs/promises');

afterEach(() => {
    vi.clearAllMocks();
    fakeWriteables.length = 0;
});

describe('renderView() tests', () => {
    test('If content.view is a function, renderView() calls content.view()', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = {};
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn).toHaveBeenCalled();
    });

    test('If content.view is a function, the correct parameters are passed to it', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn.mock.lastCall[0]).toBe(fakeEnvironment);
        expect(mockViewFn.mock.lastCall[1]).toStrictEqual({ env: fakeEnvironment, contents: testTree, someLocalProperty: 'whee' });
        expect(mockViewFn.mock.lastCall[2]).toBe(testTree);
        expect(mockViewFn.mock.lastCall[3]).toBe(testTemplateMap);
        expect(mockViewFn.mock.lastCall[4]).toBe(testContent);
    });

    test('If content.view is a function, renderView() returns the return value of content.view()', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        const expectedOutput = Buffer.from('The test output');
        mockViewFn.mockImplementation(async () => expectedOutput);
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        const testOutput = await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(testOutput).toBe(expectedOutput);
    });

    test('If content.view is a string, renderView() looks it up in the view map and calls the returned function', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        fakeEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = {};
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn).toHaveBeenCalled();
    });

    test('If content.view is a string, the correct parameters are passed to the view function', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        fakeEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn.mock.lastCall[0]).toBe(fakeEnvironment);
        expect(mockViewFn.mock.lastCall[1]).toStrictEqual({ env: fakeEnvironment, contents: testTree, someLocalProperty: 'whee' });
        expect(mockViewFn.mock.lastCall[2]).toBe(testTree);
        expect(mockViewFn.mock.lastCall[3]).toBe(testTemplateMap);
        expect(mockViewFn.mock.lastCall[4]).toBe(testContent);        
    });

    test('If content.view is a string, renderView() returns the value returned by the view function', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const mockViewFn = vi.fn();
        const expectedOutput = Buffer.from('The test output');
        mockViewFn.mockImplementation(async () => expectedOutput);
        fakeEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        const testOutput = await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(testOutput).toBe(expectedOutput);
    });

    test('If content.view is a string that is not in the view map, renderView() throws an error', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await expect(async () => await renderView(fakeEnvironment, testContent, testLocals, testTree, testTemplateMap)).rejects.toThrowError();
    });
});

describe('render() tests', () => {
    test('Succeeds if the content tree is empty', async () => {
        const tree = new ContentTree('test');
        const fakeEnvironment = new FakeEnvironment();
        const fakeOutputDir = 'testDir';
        const fakeTemplates = {};
        const fakeLocals = {};

        await render(fakeEnvironment, fakeOutputDir, tree, fakeTemplates, fakeLocals);
    });

    test('Succeeds if no items in the content tree return output', async () => {
        const tree = getFakeTree('test');
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.views.FakeView = () => Promise.resolve(null);
        const fakeOutputDir = 'testDir';
        const fakeTemplates = {};
        const fakeLocals = {};

        await render(fakeEnvironment, fakeOutputDir, tree, fakeTemplates, fakeLocals);
    });

    test('Tries to save the result of every call to renderView() that returns data', async () => {
        vi.mocked(fs.open).mockImplementation(async () => new FakeFileHandle() as unknown as fs.FileHandle);
        const tree = getFakeTree('test');
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.views.FakeView = (a, b, c, d, plugin) => Promise.resolve(Buffer.from(plugin?.__filename || 'no content'));
        const fakeOutputDir = 'testDir';
        const fakeTemplates = {};
        const fakeLocals = {};

        await render(fakeEnvironment, fakeOutputDir, tree, fakeTemplates, fakeLocals);

        expect(vi.mocked(fs.open)).toHaveBeenCalledTimes(9);
        expect(vi.mocked(fs.open)).toHaveBeenCalledWith(`${fakeOutputDir}${path.sep}index.md`, 'w');

        expect(fakeWriteables).toSatisfy((fw: FakeWriteable[]) => fw.some(w => (vi.mocked(w.end).mock.lastCall?.[0] as Buffer).toString() === 'index.md'));
    });
});
