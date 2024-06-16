import { describe, expect, test } from 'vitest';

import ContentTree from '../../core/contentTree';
import { ContentTreeGroups } from '../../core/coreTypes';
import { FakePlugin } from './fakes/fakePlugin';

describe('Important aspects of ContentTree object structure', () => {
    test('__groupnames property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('__groupnames')).toBeFalsy();
    });

    test('_ property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('_')).toBeFalsy();
    });

    test('filename property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('filename')).toBeFalsy();
    });

    test('index property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('index')).toBeFalsy();
    });

    test('parent property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('parent')).toBeFalsy();
    });

    test('isLeaf property is not enumerable', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        const testOutput = Object.keys(testObject);

        expect(testOutput.includes('isLeaf')).toBeFalsy();
    });

    test('isLeaf property is always false', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        expect(testObject.isLeaf).toBeFalsy();
    });
});

describe('Constructor tests', () => {
    test('__groupnames property is set to second parameter if present', () => {
        const testObject = new ContentTree('test', ['a', 'b']);

        expect(testObject.__groupnames).toStrictEqual(['a', 'b']);
    });

    test('__groupnames property is set to empty array if not present', () => {
        const testObject = new ContentTree('test');

        expect(testObject.__groupnames).toStrictEqual([]);
    });

    test('_.directories property is empty array', () => {
        const testObject = new ContentTree('test');

        const underscore = testObject._ as ContentTreeGroups;
        expect(underscore.directories).toStrictEqual([]);
    });

    test('_.files property is empty array', () => {
        const testObject = new ContentTree('test');

        const underscore = testObject._ as ContentTreeGroups;
        expect(underscore.files).toStrictEqual([]);
    });

    test('filename property is set to first parameter', () => {
        const testObject = new ContentTree('test');

        expect(testObject.filename).toBe('test');
    });

    test('parent property is set to null', () => {
        const testObject = new ContentTree('test');

        expect(testObject.parent).toBeNull();
    });    
});

describe('parent property tests', () => {
    test('parent property is settable', () => {
        const testObject = new ContentTree('test');
        const parentTree = new ContentTree('root');
        
        testObject.parent = parentTree;

        expect(testObject.parent).toBe(parentTree);
    });
});

describe('index property tests', () => {
    test('index property returns a property whose name starts with "index."', () => {
        const testObject = new ContentTree('test');
        testObject['test.html'] = new FakePlugin('test.html');
        const expectedOutput = new FakePlugin('index.html');
        testObject['index.html'] = expectedOutput;

        const testOutput = testObject.index;

        expect(testOutput).toBe(expectedOutput);
    });
});

describe('fromDirectory tests', () => {
    test.todo('fromDirectory() returns anticipated result based on files in directory');
    test.todo('fromDirectory() returns nested tree structure based on directory structure');
    test.todo('fromDirectory() sets parent properties of nested trees');
    test.todo('fromDirector() ignores files where appropriate');
});

describe('inspect() tests', () => {
    test.todo('inspect() returns appropriate string');
    test.todo('inspect() throws error if a ContentPlugin specifies an invalid colour');
});

describe('flatten() tests', () => {
    test.todo('flatten() returns an array of leaf nodes');
});

describe('merge() tests', () => {
    test.todo('merge() mutates its first parameter');
    test.todo('merge() does not mutate its second parameter');
});

describe('loadContent() tests', () => {
    test.todo('loadContent() instantiates correct plugin instances per filename');
});
