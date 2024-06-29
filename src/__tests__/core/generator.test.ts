import { describe, expect, test, vi } from 'vitest';

import ContentTree from '../../core/contentTree';
import runGenerator from '../../core/generator';
import { FakePlugin } from './fakes/fakePlugin';
import { FakeEnvironment } from './fakes/fakeEnvironment';

describe('runGenerator() tests', () => {
    test('Calls generator function', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const testTree = new ContentTree('testTree', ['testFiles', 'testPlugins']);
        const mockGenerator = vi.fn();
        const testDef = { name: 'testGenerator', group: 'generatedPages', fn: mockGenerator };

        await runGenerator(fakeEnvironment, testTree, testDef);

        expect(mockGenerator).toHaveBeenCalledOnce();
        expect(mockGenerator).toHaveBeenLastCalledWith(testTree);
    });

    test('Returns resolved tree', async () => {
        const fakeEnvironment = new FakeEnvironment();
        const testTree = new ContentTree('testTree', ['testFiles', 'testPlugins']);
        const outputTree = new ContentTree('generatedTree');
        const expectedContentItem = new FakePlugin('example');
        outputTree.contentItem = expectedContentItem;
        const mockGenerator = vi.fn(() => Promise.resolve(outputTree));
        const testDef = { name: 'testGenerator', group: 'generatedPages', fn: mockGenerator };

        const testOutput = await runGenerator(fakeEnvironment, testTree, testDef);

        expect(testOutput).toBeTruthy();
        expect(testOutput).toBeInstanceOf(ContentTree);
        expect(testOutput.contentItem).toBeTruthy();
        expect(testOutput.contentItem).toBe(expectedContentItem);
        expect(testOutput.__groupnames?.length).toBe(1);
        expect(testOutput.__groupnames).toContain('generatedPages');
    });
});
