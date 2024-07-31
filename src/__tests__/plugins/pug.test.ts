import { afterEach, describe, expect, test, vi } from 'vitest';

import registerPlugin, { PugTemplate } from '../../plugins/pug';
import { readFile } from 'fs/promises';
import { compile } from 'pug';
import { FakeEnvironment } from '../core/fakes/fakeEnvironment';

vi.mock('node:fs/promises');
vi.mock('pug');

afterEach(() => {
    vi.resetAllMocks();
});

describe('PugTemplate tests', () => {
    test('Constructor sets template property', () => {
        const mockTemplate = vi.fn();

        const testOutput = new PugTemplate(mockTemplate);

        expect(testOutput.template).toBe(mockTemplate);
    });

    test('name returns pug', () => {
        const mockTemplate = vi.fn();
        const testObject = new PugTemplate(mockTemplate);

        const testOutput = testObject.name;

        expect(testOutput).toBe('pug');
    });

    test('render() calls template function', async () => {
        const mockTemplate = vi.fn(() => 'Rendered template');
        const mockLocals = {};
        const testObject = new PugTemplate(mockTemplate);

        await testObject.render(mockLocals);

        expect(mockTemplate).toHaveBeenCalledOnce();
        expect(mockTemplate).toHaveBeenLastCalledWith(mockLocals);
    });

    test('render() returns buffer containing result of template function', async () => {
        const expectedOutput = 'A rendered web page';
        const mockTemplate = vi.fn(() => expectedOutput);
        const mockLocals = {};
        const testObject = new PugTemplate(mockTemplate);

        const testOutput = await testObject.render(mockLocals);

        expect(testOutput).toBeTruthy();
        expect(testOutput).toBeInstanceOf(Buffer);
        expect(testOutput.toString()).toBe(expectedOutput);
    });

    test('fromFile() reads filepath', async () => {
        const testFilepath = { full: '/www/templates/testTemplate', relative: 'templates/testTemplate' };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from('Template content'));
        await registerPlugin(new FakeEnvironment());

        await PugTemplate.fromFile(testFilepath);

        expect(readFile).toHaveBeenCalledOnce();
        expect(readFile).toHaveBeenLastCalledWith(testFilepath.full);
    });

    test('fromFile() passes contents of file to pug.compile()', async () => {
        const expectedParameter = 'The template content';
        const testFilepath = { full: '/www/templates/testTemplate', relative: 'templates/testTemplate' };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from(expectedParameter));
        await registerPlugin(new FakeEnvironment());

        await PugTemplate.fromFile(testFilepath);

        expect(compile).toHaveBeenCalledOnce();
        expect(vi.mocked(compile).mock.lastCall?.[0]).toBe(expectedParameter);
    });

    test('fromFile() passes pug configuration to pug.compile() if it is set in config', async () => {
        const expectedParameter = { setting: true, key: 'value' };
        const fakeEnvironment = new FakeEnvironment({ pug: { ...expectedParameter }});
        const testFilepath = { full: '/www/templates/testTemplate', relative: 'templates/testTemplate' };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from('The template content'));
        await registerPlugin(fakeEnvironment);

        await PugTemplate.fromFile(testFilepath);

        expect(compile).toHaveBeenCalledOnce();
        expect(vi.mocked(compile).mock.lastCall?.[1]).toStrictEqual({ ...expectedParameter, filename: testFilepath.full });
    });

    test('fromFile() passes empty configuration (aside from filename) to pug.compile() if it is not set in config', async () => {
        const testFilepath = { full: '/www/templates/testTemplate', relative: 'templates/testTemplate' };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from('The template content'));
        await registerPlugin(new FakeEnvironment());

        await PugTemplate.fromFile(testFilepath);

        expect(compile).toHaveBeenCalledOnce();
        expect(vi.mocked(compile).mock.lastCall?.[1]).toEqual({ filename: testFilepath.full });
    });

    test('fromFile() returns new instance with template set to return value of pug.compile()', async () => {
        const testFilepath = { full: '/www/templates/testTemplate', relative: 'templates/testTemplate' };
        vi.mocked(readFile).mockImplementation(async () => Buffer.from('The template content'));
        const expectedResult = vi.fn();
        vi.mocked(compile).mockReturnValue(expectedResult);
        await registerPlugin(new FakeEnvironment);

        const testOutput = await PugTemplate.fromFile(testFilepath);

        expect(testOutput.template).toBe(expectedResult);
    });
});

describe('Plugin registration tests', () => {
    test('Plugin registration calls environment.registerTemplatePlugin() with correct arguments', async () => {
        const fakeEnvironment = new FakeEnvironment();
        vi.spyOn(fakeEnvironment, 'registerTemplatePlugin');

        await registerPlugin(fakeEnvironment);

        expect(fakeEnvironment.registerTemplatePlugin).toHaveBeenCalledOnce();
        expect(fakeEnvironment.registerTemplatePlugin).toHaveBeenLastCalledWith('**/*.*(pug|jade)', PugTemplate);
    });
});
