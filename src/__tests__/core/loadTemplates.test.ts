import { describe, expect, test, vi } from 'vitest';

import { readDirRecursive } from '../../core/utils';
import loadTemplates from '../../core/loadTemplates';
import FakeTemplate from './fakes/fakeTemplate';
import SpecialFakeTemplate from './fakes/specialFakeTemplate';
import BrokenFakeTemplate from './fakes/brokenFakeTemplate';
import { FakeEnvironment } from './fakes/fakeEnvironment';

vi.mock('../../core/utils');

describe('loadTemplates() tests', () => {
    test('Returns template for each file in environment templates folder', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.templatesPath = 'testTemplates';
        fakeEnvironment.templatePlugins.push({ pattern: '*', class: FakeTemplate });
        vi.mocked(readDirRecursive).mockImplementation(async () => ['template.test', 'other.thing']);
        
        const testOutput = await loadTemplates(fakeEnvironment);

        expect(readDirRecursive).toHaveBeenCalledOnce();
        expect(readDirRecursive).toHaveBeenLastCalledWith('testTemplates');
        expect(Object.keys(testOutput).length).toBe(2);
        expect((testOutput['template.test'] as FakeTemplate).__filepath.relative).toBe('template.test');
        expect((testOutput['other.thing'] as FakeTemplate).__filepath.relative).toBe('other.thing');
    });

    test('Loads correct template plugin for each file', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.templatesPath = 'testTemplates';
        fakeEnvironment.templatePlugins.push(
            { pattern: '*.test', class: FakeTemplate },
            { pattern: '*.thing', class: SpecialFakeTemplate },
        );
        vi.mocked(readDirRecursive).mockImplementation(async () => ['template.test', 'other.thing']);
        
        const testOutput = await loadTemplates(fakeEnvironment);

        expect(Object.keys(testOutput).length).toBe(2);
        expect((testOutput['template.test'] as FakeTemplate).__filepath.relative).toBe('template.test');
        expect(testOutput['template.test']).toBeInstanceOf(FakeTemplate);
        expect((testOutput['other.thing'] as SpecialFakeTemplate).__filepath.relative).toBe('other.thing');
        expect(testOutput['other.thing']).toBeInstanceOf(SpecialFakeTemplate);
    });

    test('Ignores files that do not have a matching plugin', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.templatesPath = 'testTemplates';
        fakeEnvironment.templatePlugins.push({ pattern: '*.test', class: FakeTemplate });
        vi.mocked(readDirRecursive).mockImplementation(async () => ['template.test', 'other.thing']);
        
        const testOutput = await loadTemplates(fakeEnvironment);

        expect(Object.keys(testOutput).length).toBe(1);
        expect((testOutput['template.test'] as FakeTemplate).__filepath.relative).toBe('template.test');
        expect(testOutput['template.test']).toBeInstanceOf(FakeTemplate);
    });

    test('Throws error if plugin fromFile() function throws error', async () => {
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.templatesPath = 'testTemplates';
        fakeEnvironment.templatePlugins.push({ pattern: '*.test', class: BrokenFakeTemplate });
        vi.mocked(readDirRecursive).mockImplementation(async () => ['template.test', 'other.thing']);

        await expect(async () => await loadTemplates(fakeEnvironment)).rejects.toThrowError();
    });
});
