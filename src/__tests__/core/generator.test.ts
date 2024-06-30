import { describe, expect, test, vi } from 'vitest';

import { defaultConfig } from '../../core/config';
import Environment from '../../core/environment';
import { testLogger } from '../testUtils';
import ContentTree from '../../core/contentTree';
import runGenerator from '../../core/generator';
import { FakePlugin } from './fakes/fakePlugin';

describe('runGenerator() tests', () => {
    test('Calls generator function', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const testTree = new ContentTree('testTree', ['testFiles', 'testPlugins']);
        const mockGenerator = vi.fn();
        const testDef = { name: 'testGenerator', group: 'generatedPages', fn: mockGenerator };

        await runGenerator(testEnvironment, testTree, testDef);

        expect(mockGenerator).toHaveBeenCalledOnce();
        expect(mockGenerator).toHaveBeenLastCalledWith(testTree);
    });

    test('Returns resolved tree', async () => {
        const testConfig = { ...defaultConfig };
        const testEnvironment = await Environment.factory(testConfig, 'testDir', testLogger);
        const testTree = new ContentTree('testTree', ['testFiles', 'testPlugins']);
        const outputTree = new ContentTree('generatedTree');
        const expectedContentItem = new FakePlugin('example');
        outputTree.contentItem = expectedContentItem;
        const mockGenerator = vi.fn(() => Promise.resolve(outputTree));
        const testDef = { name: 'testGenerator', group: 'generatedPages', fn: mockGenerator };

        const testOutput = await runGenerator(testEnvironment, testTree, testDef);

        expect(testOutput).toBeTruthy();
        expect(testOutput).toBeInstanceOf(ContentTree);
        expect(testOutput.contentItem).toBeTruthy();
        expect(testOutput.contentItem).toBe(expectedContentItem);
        expect(testOutput.__groupnames?.length).toBe(1);
        expect(testOutput.__groupnames).toContain('generatedPages');
    });
});
