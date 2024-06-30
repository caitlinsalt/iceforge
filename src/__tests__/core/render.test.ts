import { describe, expect, test, vi } from 'vitest';

import { defaultConfig } from '../../core/config';
import Environment from '../../core/environment';
import { testLogger } from '../testUtils';
import { renderView } from '../../core/render';
import { FakePlugin } from './fakes/fakePlugin';
import ContentTree from '../../core/contentTree';

describe('renderView() tests', () => {
    test('If content.view is a function, renderView() calls content.view()', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = {};
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn).toHaveBeenCalled();
    });

    test('If content.view is a function, the correct parameters are passed to it', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn.mock.lastCall[0]).toBe(testEnvironment);
        expect(mockViewFn.mock.lastCall[1]).toStrictEqual({ env: testEnvironment, contents: testTree, someLocalProperty: 'whee' });
        expect(mockViewFn.mock.lastCall[2]).toBe(testTree);
        expect(mockViewFn.mock.lastCall[3]).toBe(testTemplateMap);
        expect(mockViewFn.mock.lastCall[4]).toBe(testContent);
    });

    test('If content.view is a function, renderView() returns the return value of content.view()', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        const expectedOutput = Buffer.from('The test output');
        mockViewFn.mockImplementation(async () => expectedOutput);
        const testContent = new FakePlugin('testContent', mockViewFn);
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        const testOutput = await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(testOutput).toBe(expectedOutput);
    });

    test('If content.view is a string, renderView() looks it up in the view map and calls the returned function', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        testEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = {};
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn).toHaveBeenCalled();
    });

    test('If content.view is a string, the correct parameters are passed to the view function', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        testEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(mockViewFn.mock.lastCall[0]).toBe(testEnvironment);
        expect(mockViewFn.mock.lastCall[1]).toStrictEqual({ env: testEnvironment, contents: testTree, someLocalProperty: 'whee' });
        expect(mockViewFn.mock.lastCall[2]).toBe(testTree);
        expect(mockViewFn.mock.lastCall[3]).toBe(testTemplateMap);
        expect(mockViewFn.mock.lastCall[4]).toBe(testContent);        
    });

    test('If content.view is a string, renderView() returns the value returned by the view function', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const mockViewFn = vi.fn();
        const expectedOutput = Buffer.from('The test output');
        mockViewFn.mockImplementation(async () => expectedOutput);
        testEnvironment.views.testView = mockViewFn;
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        const testOutput = await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap);

        expect(testOutput).toBe(expectedOutput);
    });

    test('If content.view is a string that is not in the view map, renderView() throws an error', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const testContent = new FakePlugin('testContent', 'testView');
        const testLocals = { someLocalProperty: 'whee' };
        const testTree = new ContentTree('testRoot');
        const testTemplateMap = {};

        await expect(async () => await renderView(testEnvironment, testContent, testLocals, testTree, testTemplateMap)).rejects.toThrowError();
    });
});

describe('render() tests', () => {
    test.todo('Calls renderView() for every item in the content tree');
    test.todo('Succeeds if the content tree is empty');
    test.todo('Succeeds if no items in the content tree return output');
    test.todo('Tries to save the result of every call to renderView() that returns data');
});
