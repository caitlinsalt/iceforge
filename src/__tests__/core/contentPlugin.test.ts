import { describe, expect, test } from 'vitest';

import ContentPlugin from '../../core/contentPlugin';

describe('ContentPlugin tests', () => {
    test('name returns ContentPlugin', () => {
        const testObject = new ContentPlugin();

        expect(testObject.name).toBe('ContentPlugin');
    });

    test('view throws error', () => {
        const testObject = new ContentPlugin();

        expect(() => testObject.view).toThrowError();
    });

    test('filename throws error', () => {
        const testObject = new ContentPlugin();

        expect(() => testObject.filename).toThrowError();
    });

    test('url throws error', () => {
        const testObject = new ContentPlugin();

        expect(() => testObject.url).toThrowError();
    });

    test('getUrl throws error', () => {
        const testObject = new ContentPlugin();

        expect(() => testObject.getUrl('base')).toThrowError();
    });

    test('pluginInfo throws error', () => {
        const testObject = new ContentPlugin();

        expect(() => testObject.pluginInfo).toThrowError();
    });

    test('fromFile throws error', async () => {
        const testInput = { full: 'test', relative: './test' };
        
        await expect(() => ContentPlugin.fromFile(testInput)).rejects.toThrowError();
    });

    test('pluginColour returns cyan', () => {
        const testObject = new ContentPlugin();

        expect(testObject.pluginColour).toBe('cyan');
    });

    test('isLeaf returns true', () => {
        const testObject = new ContentPlugin();

        expect(testObject.isLeaf).toBeTruthy();
    });
});
