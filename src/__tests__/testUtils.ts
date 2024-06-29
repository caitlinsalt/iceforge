import { expect } from 'vitest';
import * as winston from 'winston';

import { transports } from '../core/logger';
import { IContentTree, ContentTreeGroups } from '../core/coreTypes';
import ContentPlugin, { ContentPluginDef } from '../core/contentPlugin';
import ContentTree from '../core/contentTree';

import { FakePlugin } from './core/fakes/fakePlugin';

export const testLogger = winston.createLogger({
    exitOnError: true,
    transports: transports,
    silent: true
});

export const expectEquivalentPlugins = (a: ContentPlugin, b: ContentPlugin, recurse = true, ignoreFilename = false) => {
    if (a === b) { 
        return;
    }

    expect(Object.getPrototypeOf(a).name).toBe(Object.getPrototypeOf(b).name);
    expect(a.__plugin.name).toBe(b.__plugin.name);
    expect(a.__plugin.group).toBe(b.__plugin.group);
    expect((a.__plugin as ContentPluginDef).pattern).toBe((b.__plugin as ContentPluginDef).pattern);
    expect((a.__plugin as ContentPluginDef).class.name).toBe((b.__plugin as ContentPluginDef).class.name);
    if (a.parent) {
        if (recurse) {
            expectEquivalentTrees(a.parent, b.parent as IContentTree, false, ignoreFilename);
        }
    } else {
        expect(b.parent).toBeNull();
    }
    expect(a.__filename).toBe(b.__filename);
    expect(a.name).toBe(b.name);
};

// This function asserts that two trees are equivalent, in a matching way to partialDeepCloneTree.
// In other words, the code expectEquivalentTrees(a, partialDeepCloneTree(a)) should pass.
export const expectEquivalentTrees = (a: IContentTree, b: IContentTree, recurse = true, ignoreFilename = false) => {
    if (!ignoreFilename) {
        expect(a.filename).toBe(b.filename);
    }
    expect(a.__groupnames).toEqual(b.__groupnames);

    expect(Object.keys(a).length).toBe(Object.keys(b).length);
    for (const key in a) {
        expect(b[key]).toBeTruthy();
        const item = a[key] as IContentTree | ContentPlugin;
        if (item.isLeaf) {
            expectEquivalentPlugins(b[key] as ContentPlugin, item as ContentPlugin, recurse, ignoreFilename);
        } else if (recurse) {
            expectEquivalentTrees(item as IContentTree, b[key] as IContentTree, recurse, ignoreFilename);
        }
    }
    if (a.parent) {
        expectEquivalentTrees(a.parent, b.parent as IContentTree, false, ignoreFilename);
    } else {
        expect(b.parent).toBeFalsy();
    }
};

export const getFakeTree = (treeName: string, groupnames: string[] = []) => {
    const testObject = new ContentTree(treeName, groupnames);
    testObject['index.md'] = new FakePlugin('index.md', undefined, testObject);
    testObject['bg.jpg'] = new FakePlugin('bg.jpg', undefined, testObject);
    testObject['style.css'] = new FakePlugin('style.css', undefined, testObject);
    testObject['subdir2'] = new ContentTree('subdir2');
    testObject['subdir2'].parent = testObject;
    (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
    testObject['subdir2']['assets'] = new ContentTree('assets');
    testObject['subdir2']['assets'].parent = testObject['subdir2'];
    (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
    (testObject['subdir2']._ as ContentTreeGroups).directories.push(testObject['subdir2']['assets']);
    testObject['subdir2']['assets']['img1.jpg'] = new FakePlugin('img1.jpg', undefined, testObject['subdir2']['assets']);
    testObject['subdir2']['assets']['img2.jpg'] = new FakePlugin('img2.jpg', undefined, testObject['subdir2']['assets']);
    testObject['subdir2']['assets']['img3.png'] = new FakePlugin('img3.png', undefined, testObject['subdir2']['assets']);
    testObject['subdir1'] = new ContentTree('subdir1');
    testObject['subdir1'].parent = testObject;
    (testObject._ as ContentTreeGroups).directories.push(testObject['subdir1']);
    testObject['subdir1']['file1.pdf'] = new FakePlugin('file1.pdf', undefined, testObject['subdir1']);
    testObject['subdir1']['file2.pdf'] = new FakePlugin('file2.pdf', undefined, testObject['subdir1']);
    testObject['subdir1']['file3.pdf'] = new FakePlugin('file3.pdf', undefined, testObject['subdir1']);
    return testObject;
};
