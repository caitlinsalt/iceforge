import { describe, expect, test } from 'vitest';

import TemplatePlugin from '../../core/templatePlugin';

describe('TemplatePlugin tests', () => {
    test('name returns TemplatePlugin', () => {
        const testObject = new TemplatePlugin();

        expect (testObject.name).toBe('TemplatePlugin');
    });
    
    test('render() throws error', async () => {
        const testObject = new TemplatePlugin();

        await expect(async () => await testObject.render({})).rejects.toThrowError();
    });

    test('fromFile() throws error', async () => {
        const testInput = { full: 'test', relative: './test' };

        await expect(async () => await TemplatePlugin.fromFile(testInput)).rejects.toThrowError();
    });
});
