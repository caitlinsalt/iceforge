import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';
import { Dirent, Stats } from 'node:fs';
import chalk from 'chalk';

import ContentTree, { loadContent } from '../../core/contentTree';
import { ContentTreeGroups, IContentTree } from '../../core/coreTypes';
import { FakePlugin } from './fakes/fakePlugin';
import { FakeEnvironment } from './fakes/fakeEnvironment';
import { expectEquivalentTrees } from '../testUtils';
import ContentPlugin from '../../core/contentPlugin';

vi.mock('node:fs/promises');
vi.mock('chalk', () => ({
    default: {
        cyan: vi.fn(),
        bold: vi.fn(),
        grey: vi.fn(),
    }
}));

// This clone function clones the nested trees, but copies the leaf nodes.
const partialDeepCloneTree = (tree: IContentTree): ContentTree => {
    const rv = new ContentTree(tree.filename as string, [ ...(tree.__groupnames as string[]) ]);

    for (const key in tree) {
        const item = tree[key] as IContentTree | ContentPlugin;
        if (item.isLeaf) {
            rv[key] = item;
            const group = (item as ContentPlugin).__plugin.group;
            if (!((rv._ as ContentTreeGroups)[group])) {
                rv._[group] = [];
            }
            (rv._[group] as ContentPlugin[]).push(item as ContentPlugin);
        } else {
            const node = partialDeepCloneTree(item as IContentTree);
            node.parent = rv;
            rv[key] = node;
            (rv._ as ContentTreeGroups).directories.push(node);
        }
    }

    return rv;
};

beforeEach(() => {
    vi.mocked(chalk.cyan).mockImplementation((x) => x as string);
    vi.mocked(chalk.bold).mockImplementation((x) => x as string);
    vi.mocked(chalk.grey).mockImplementation((x) => x as string);
});

afterEach(() => {
    vi.resetAllMocks();
}); 

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
    test('fromDirectory() returns anticipated result based on files in directory', async () => {
        vi.mocked(readdir).mockImplementation(async () => {
            return [ 'file1.md', 'file2.md', 'f3.jpg' ] as string[] & Dirent[];
        });
        vi.mocked(stat).mockImplementation(async () => ({ isDirectory: () => false, isFile: () => true }) as Stats);
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.contentPlugins.push({ name: 'FakePlugin', group: 'fakes', pattern: '**/*', class: FakePlugin });
        
        const testOutput = await ContentTree.fromDirectory(fakeEnvironment, 'topDir');

        expect(testOutput).toBeTruthy();
        expect(testOutput['file1.md']).toBeTruthy();
        expect(testOutput['file2.md']).toBeTruthy();
        expect(testOutput['f3.jpg']).toBeTruthy();
    });

    test('fromDirectory() returns nested tree structure based on directory structure', async () => {
        vi.mocked(readdir).mockImplementation(async (dir) => {
            switch (dir) {
            case 'top':
                return [
                    'subdir1',
                    'subdir2',
                    'index.md',
                    'style.css',
                    'bg.jpg',                    
                ] as string[] & Dirent[];
            case `top${path.sep}subdir1`:
                return [ 'file1.pdf', 'file2.pdf' ] as string[] & Dirent[];
            case `top${path.sep}subdir2`:
                return [ 'assets' ] as string[] & Dirent[];
            case `top${path.sep}subdir2${path.sep}assets`:
                return [ 'img1.jpg', 'img2.jpg', 'img3.png' ] as string[] & Dirent[];
            }
            return [] as string[] & Dirent[];
        });
        vi.mocked(stat).mockImplementation(async (p) => {
            const dirs = [
                'top',
                `top${path.sep}subdir1`,
                `top${path.sep}subdir2`,
                `top${path.sep}subdir2${path.sep}assets`,
            ];
            if (dirs.includes(p as string)) {
                return { isDirectory: () => true, isFile: () => false } as Stats;
            }
            return { isDirectory: () => false, isFile: () => true } as Stats;
        });
        const fakeEnvironment = new FakeEnvironment({ contents: '.' });
        fakeEnvironment.contentPlugins.push({ name: 'FakePlugin', group: 'fakes', pattern: '**/*', class: FakePlugin });

        const testOutput = await ContentTree.fromDirectory(fakeEnvironment, 'top');

        expect(testOutput).toBeTruthy();
        expect(testOutput['index.md']).toBeTruthy();
        expect(testOutput['index.md']).toBeInstanceOf(FakePlugin);
        expect(testOutput['style.css']).toBeTruthy();
        expect(testOutput['style.css']).toBeInstanceOf(FakePlugin);
        expect(testOutput['bg.jpg']).toBeTruthy();
        expect(testOutput['bg.jpg']).toBeInstanceOf(FakePlugin);
        expect(testOutput['subdir1']).toBeTruthy();
        expect(testOutput['subdir1']).toBeInstanceOf(ContentTree);
        expect(testOutput['subdir1']['file1.pdf']).toBeTruthy();
        expect(testOutput['subdir1']['file1.pdf']).toBeInstanceOf(FakePlugin);
        expect(testOutput['subdir1']['file2.pdf']).toBeTruthy();
        expect(testOutput['subdir1']['file2.pdf']).toBeInstanceOf(FakePlugin);
        expect(testOutput['subdir2']).toBeTruthy();
        expect(testOutput['subdir2']).toBeInstanceOf(ContentTree);
        expect(testOutput['subdir2']['assets']).toBeTruthy();
        expect(testOutput['subdir2']['assets']).toBeInstanceOf(ContentTree);
        expect(testOutput['subdir2']['assets']['img1.jpg']).toBeTruthy();
        expect(testOutput['subdir2']['assets']['img1.jpg']).toBeInstanceOf(FakePlugin);
        expect(testOutput['subdir2']['assets']['img2.jpg']).toBeTruthy();
        expect(testOutput['subdir2']['assets']['img2.jpg']).toBeInstanceOf(FakePlugin);
        expect(testOutput['subdir2']['assets']['img3.png']).toBeTruthy();
        expect(testOutput['subdir2']['assets']['img3.png']).toBeInstanceOf(FakePlugin);
    });

    test('fromDirectory() sets parent properties of nested trees', async () => {
        vi.mocked(readdir).mockImplementation(async (dir) => {
            switch (dir) {
            case 'top':
                return [
                    'subdir1',
                    'subdir2',
                    'index.md',
                    'style.css',
                    'bg.jpg',                    
                ] as string[] & Dirent[];
            case `top${path.sep}subdir1`:
                return [ 'file1.pdf', 'file2.pdf' ] as string[] & Dirent[];
            case `top${path.sep}subdir2`:
                return [ 'assets' ] as string[] & Dirent[];
            case `top${path.sep}subdir2${path.sep}assets`:
                return [ 'img1.jpg', 'img2.jpg', 'img3.png' ] as string[] & Dirent[];
            }
            return [] as string[] & Dirent[];
        });
        vi.mocked(stat).mockImplementation(async (p) => {
            const dirs = [
                'top',
                `top${path.sep}subdir1`,
                `top${path.sep}subdir2`,
                `top${path.sep}subdir2${path.sep}assets`,
            ];
            if (dirs.includes(p as string)) {
                return { isDirectory: () => true, isFile: () => false } as Stats;
            }
            return { isDirectory: () => false, isFile: () => true } as Stats;
        });
        const fakeEnvironment = new FakeEnvironment({ contents: '.' });
        fakeEnvironment.contentPlugins.push({ name: 'FakePlugin', group: 'fakes', pattern: '**/*', class: FakePlugin });

        const testOutput = await ContentTree.fromDirectory(fakeEnvironment, 'top');

        expect((testOutput['subdir1'] as IContentTree).parent).toBe(testOutput);
        expect((testOutput['subdir2'] as IContentTree).parent).toBe(testOutput);
        expect((testOutput['subdir2']['assets'] as IContentTree).parent).toBe(testOutput['subdir2']);
    });

    test('fromDirectory() adds all nested trees to appropriate ContentTree._.directories array', async () => {
        vi.mocked(readdir).mockImplementation(async (dir) => {
            switch (dir) {
            case 'top':
                return [
                    'subdir1',
                    'subdir2',
                    'index.md',
                    'style.css',
                    'bg.jpg',                    
                ] as string[] & Dirent[];
            case `top${path.sep}subdir1`:
                return [ 'file1.pdf', 'file2.pdf' ] as string[] & Dirent[];
            case `top${path.sep}subdir2`:
                return [ 'assets' ] as string[] & Dirent[];
            case `top${path.sep}subdir2${path.sep}assets`:
                return [ 'img1.jpg', 'img2.jpg', 'img3.png' ] as string[] & Dirent[];
            }
            return [] as string[] & Dirent[];
        });
        vi.mocked(stat).mockImplementation(async (p) => {
            const dirs = [
                'top',
                `top${path.sep}subdir1`,
                `top${path.sep}subdir2`,
                `top${path.sep}subdir2${path.sep}assets`,
            ];
            if (dirs.includes(p as string)) {
                return { isDirectory: () => true, isFile: () => false } as Stats;
            }
            return { isDirectory: () => false, isFile: () => true } as Stats;
        });
        const fakeEnvironment = new FakeEnvironment({ contents: '.' });
        fakeEnvironment.contentPlugins.push({ name: 'FakePlugin', group: 'fakes', pattern: '**/*', class: FakePlugin });

        const testOutput = await ContentTree.fromDirectory(fakeEnvironment, 'top');

        expect(testOutput._?.directories.length).toBe(2);
        expect(testOutput._?.directories).toContain(testOutput['subdir1']);
        expect(testOutput._?.directories).toContain(testOutput['subdir2']);
        expect((testOutput['subdir2'] as IContentTree)._?.directories.length).toBe(1);
        expect((testOutput['subdir2'] as IContentTree)._?.directories).toContain(testOutput['subdir2']['assets']);
    });

    test('fromDirectory() ignores files where appropriate', async () => {
        vi.mocked(readdir).mockImplementation(async (dir) => {
            switch (dir) {
            case 'top':
                return [
                    'subdir1',
                    'subdir2',
                    'index.md',
                    'style.css',
                    'bg.jpg',                    
                ] as string[] & Dirent[];
            case `top${path.sep}subdir1`:
                return [ 'file1.pdf', 'file2.pdf' ] as string[] & Dirent[];
            case `top${path.sep}subdir2`:
                return [ 'assets' ] as string[] & Dirent[];
            case `top${path.sep}subdir2${path.sep}assets`:
                return [ 'img1.jpg', 'img2.jpg', 'img3.png' ] as string[] & Dirent[];
            }
            return [] as string[] & Dirent[];
        });
        vi.mocked(stat).mockImplementation(async (p) => {
            const dirs = [
                'top',
                `top${path.sep}subdir1`,
                `top${path.sep}subdir2`,
                `top${path.sep}subdir2${path.sep}assets`,
            ];
            if (dirs.includes(p as string)) {
                return { isDirectory: () => true, isFile: () => false } as Stats;
            }
            return { isDirectory: () => false, isFile: () => true } as Stats;
        });
        const fakeEnvironment = new FakeEnvironment({ contents: '.', ignore: [ '**/*.pdf', '**/*.png' ] });
        fakeEnvironment.contentPlugins.push({ name: 'FakePlugin', group: 'fakes', pattern: '**/*', class: FakePlugin });

        const testOutput = await ContentTree.fromDirectory(fakeEnvironment, 'top');

        expect(testOutput['subdir1']['file1.pdf']).toBeFalsy();
        expect(testOutput['subdir1']['file2.pdf']).toBeFalsy();
        expect(testOutput['subdir2']['assets']['img3.png']).toBeFalsy();
    });
});

describe('inspect() tests', () => {
    test('inspect() returns appropriate string', () => {
        const testObject = new ContentTree('top');
        testObject['index.md'] = new FakePlugin('index.md');
        testObject['bg.jpg'] = new FakePlugin('bg.jpg');
        testObject['style.css'] = new FakePlugin('style.css');
        testObject['subdir2'] = new ContentTree('subdir2');
        testObject['subdir2'].parent = testObject;
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
        testObject['subdir2']['assets'] = new ContentTree('assets');
        testObject['subdir2']['assets'].parent = testObject['subdir2'];
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
        (testObject['subdir2']._ as ContentTreeGroups).directories.push(testObject['subdir2']['assets']);
        testObject['subdir2']['assets']['img1.jpg'] = new FakePlugin('img1.jpg');
        testObject['subdir2']['assets']['img2.jpg'] = new FakePlugin('img2.jpg');
        testObject['subdir2']['assets']['img3.png'] = new FakePlugin('img3.png');
        testObject['subdir1'] = new ContentTree('subdir1');
        testObject['subdir1'].parent = testObject;
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir1']);
        testObject['subdir1']['file1.pdf'] = new FakePlugin('file1.pdf');
        testObject['subdir1']['file2.pdf'] = new FakePlugin('file2.pdf');
        testObject['subdir1']['file3.pdf'] = new FakePlugin('file3.pdf');
        
        const testOutput = ContentTree.inspect(testObject);

        expect(testOutput).toBe(`subdir1/
 file1.pdf (url: /file1.pdf plugin: FakePlugin)
 file2.pdf (url: /file2.pdf plugin: FakePlugin)
 file3.pdf (url: /file3.pdf plugin: FakePlugin)
subdir2/
 assets/
  img1.jpg (url: /img1.jpg plugin: FakePlugin)
  img2.jpg (url: /img2.jpg plugin: FakePlugin)
  img3.png (url: /img3.png plugin: FakePlugin)
bg.jpg (url: /bg.jpg plugin: FakePlugin)
index.md (url: /index.md plugin: FakePlugin)
style.css (url: /style.css plugin: FakePlugin)`);
        expect(vi.mocked(chalk.bold).mock.calls).toStrictEqual([ [ 'subdir1' ], [ 'subdir2' ], [ 'assets' ]]);
        expect(vi.mocked(chalk.cyan).mock.calls).toStrictEqual([
            [ 'file1.pdf' ],
            [ 'file2.pdf' ],
            [ 'file3.pdf' ],
            [ 'img1.jpg' ],
            [ 'img2.jpg' ],
            [ 'img3.png' ],
            [ 'bg.jpg' ],
            [ 'index.md' ],
            [ 'style.css' ]
        ]);
        expect(vi.mocked(chalk.grey).mock.calls).toStrictEqual([
            [ 'url: /file1.pdf plugin: FakePlugin' ],
            [ 'url: /file2.pdf plugin: FakePlugin' ],
            [ 'url: /file3.pdf plugin: FakePlugin' ],
            [ 'url: /img1.jpg plugin: FakePlugin' ],
            [ 'url: /img2.jpg plugin: FakePlugin' ],
            [ 'url: /img3.png plugin: FakePlugin' ],
            [ 'url: /bg.jpg plugin: FakePlugin' ],
            [ 'url: /index.md plugin: FakePlugin' ],
            [ 'url: /style.css plugin: FakePlugin' ],
        ]);
    });

    test('inspect() throws error if a ContentPlugin specifies an invalid colour', () => {
        class BrokenPlugin extends FakePlugin {
            get pluginColour() {
                return 'This is not a real colour';
            }
        }

        const testObject = new ContentTree('top');
        testObject['index.md'] = new FakePlugin('index.md');
        testObject['bg.jpg'] = new FakePlugin('bg.jpg');
        testObject['style.css'] = new FakePlugin('style.css');
        testObject['subdir2'] = new ContentTree('subdir2');
        testObject['subdir2'].parent = testObject;
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
        testObject['subdir2']['assets'] = new ContentTree('assets');
        testObject['subdir2']['assets'].parent = testObject['subdir2'];
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
        (testObject['subdir2']._ as ContentTreeGroups).directories.push(testObject['subdir2']['assets']);
        testObject['subdir2']['assets']['img1.jpg'] = new BrokenPlugin('img1.jpg');
        testObject['subdir2']['assets']['img2.jpg'] = new FakePlugin('img2.jpg');
        testObject['subdir2']['assets']['img3.png'] = new FakePlugin('img3.png');
        testObject['subdir1'] = new ContentTree('subdir1');
        testObject['subdir1'].parent = testObject;
        (testObject._ as ContentTreeGroups).directories.push(testObject['subdir1']);
        testObject['subdir1']['file1.pdf'] = new FakePlugin('file1.pdf');
        testObject['subdir1']['file2.pdf'] = new FakePlugin('file2.pdf');
        testObject['subdir1']['file3.pdf'] = new FakePlugin('file3.pdf');

        expect(() => ContentTree.inspect(testObject)).toThrowError();
    });
});

describe('flatten() tests', () => {
    describe('flatten() returns an array of leaf nodes...', () => {
        test('...if its parameter is a ContentTree', () => {
            const testObject = new ContentTree('top');
            testObject['index.md'] = new FakePlugin('index.md');
            testObject['bg.jpg'] = new FakePlugin('bg.jpg');
            testObject['style.css'] = new FakePlugin('style.css');
            testObject['subdir2'] = new ContentTree('subdir2');
            testObject['subdir2'].parent = testObject;
            (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
            testObject['subdir2']['assets'] = new ContentTree('assets');
            testObject['subdir2']['assets'].parent = testObject['subdir2'];
            (testObject._ as ContentTreeGroups).directories.push(testObject['subdir2']);
            (testObject['subdir2']._ as ContentTreeGroups).directories.push(testObject['subdir2']['assets']);
            testObject['subdir2']['assets']['img1.jpg'] = new FakePlugin('img1.jpg');
            testObject['subdir2']['assets']['img2.jpg'] = new FakePlugin('img2.jpg');
            testObject['subdir2']['assets']['img3.png'] = new FakePlugin('img3.png');
            testObject['subdir1'] = new ContentTree('subdir1');
            testObject['subdir1'].parent = testObject;
            (testObject._ as ContentTreeGroups).directories.push(testObject['subdir1']);
            testObject['subdir1']['file1.pdf'] = new FakePlugin('file1.pdf');
            testObject['subdir1']['file2.pdf'] = new FakePlugin('file2.pdf');
            testObject['subdir1']['file3.pdf'] = new FakePlugin('file3.pdf');
        
            const testOutput = ContentTree.flatten(testObject);

            expect(testOutput.length).toBe(9);
            expect(testOutput).toContain(testObject['index.md']);
            expect(testOutput).toContain(testObject['bg.jpg']);
            expect(testOutput).toContain(testObject['style.css']);
            expect(testOutput).toContain(testObject['subdir1']['file1.pdf']);
            expect(testOutput).toContain(testObject['subdir1']['file2.pdf']);
            expect(testOutput).toContain(testObject['subdir1']['file3.pdf']);
            expect(testOutput).toContain(testObject['subdir2']['assets']['img1.jpg']);
            expect(testOutput).toContain(testObject['subdir2']['assets']['img2.jpg']);
            expect(testOutput).toContain(testObject['subdir2']['assets']['img3.png']);
        });

        test('...if its parameter is an array of ContentTrees', () => {
            const testObject1 = new ContentTree('top');
            testObject1['index.md'] = new FakePlugin('index.md');
            testObject1['bg.jpg'] = new FakePlugin('bg.jpg');
            testObject1['style.css'] = new FakePlugin('style.css');
            const testObject2 = new ContentTree('side');
            testObject2['file1.pdf'] = new FakePlugin('file1.pdf');

            const testOutput = ContentTree.flatten([ testObject1, testObject2 ]);

            expect(testOutput.length).toBe(4);
            expect(testOutput).toContain(testObject1['index.md']);
            expect(testOutput).toContain(testObject1['bg.jpg']);
            expect(testOutput).toContain(testObject1['style.css']);
            expect(testOutput).toContain(testObject2['file1.pdf']);
        });
    });
});

describe('merge() tests', () => {
    test('merge() mutates its first parameter correctly', () => {
        const firstTree = new ContentTree('firstTree');
        firstTree['index.md'] = new FakePlugin('index.md');
        firstTree['d'] = new ContentTree('d');
        firstTree['d'].parent = firstTree;
        firstTree['d']['index.md'] = new FakePlugin('index.md');
        firstTree['f'] = new ContentTree('f');
        firstTree['f'].parent = firstTree;
        firstTree['f']['img1.jpg'] = new FakePlugin('img1.jpg');
        firstTree['f']['img2.jpg'] = new FakePlugin('img2.jpg');
        (firstTree._ as ContentTreeGroups).fakes = [ 
            firstTree['index.md'], 
        ];
        (firstTree._ as ContentTreeGroups).directories = [ firstTree['d'], firstTree['f'] ];
        (firstTree['d']._ as ContentTreeGroups).fakes = [ firstTree['d']['index.md'] ];
        (firstTree['f']._ as ContentTreeGroups).fakes = [ 
            firstTree['f']['img1.jpg'], 
            firstTree['f']['img2.jpg'] 
        ];

        const secondTree = new ContentTree('secondTree');
        secondTree['style.css'] = new FakePlugin('style.css');
        secondTree['e'] = new ContentTree('e');
        secondTree['e'].parent = secondTree;
        secondTree['e']['f1.md'] = new FakePlugin('f1.md');
        secondTree['f'] = new ContentTree('f');
        secondTree['f'].parent = secondTree;
        secondTree['f']['g'] = new ContentTree('g');
        secondTree['f']['g'].parent = secondTree['f'];
        secondTree['f']['g']['h.png'] = new FakePlugin('h.png');
        (secondTree._ as ContentTreeGroups).fakes = [
            secondTree['style.css'],
        ];
        (secondTree['e']._ as ContentTreeGroups).fakes = [ secondTree['e']['f1.md'] ];
        (secondTree._ as ContentTreeGroups).directories = [
            secondTree['e'],
            secondTree['f'],
        ];
        (secondTree['f']._ as ContentTreeGroups).directories = [ secondTree['f']['g'] ];
        (secondTree['f']['g']._ as ContentTreeGroups).fakes = [ secondTree['f']['g']['h.png'] ];

        const expectedResult = new ContentTree('firstTree');
        expectedResult['index.md'] = firstTree['index.md'];
        expectedResult['style.css'] = secondTree['style.css'];
        expectedResult['d'] = new ContentTree('d');
        expectedResult['d'].parent = expectedResult;
        expectedResult['d']['index.md'] = firstTree['d']['index.md'];
        expectedResult['e'] = new ContentTree('e');
        expectedResult['e'].parent = expectedResult;
        expectedResult['e']['f1.md'] = secondTree['e']['f1.md'];
        expectedResult['f'] = new ContentTree('f');
        expectedResult['f'].parent = expectedResult;
        expectedResult['f']['img1.jpg'] = firstTree['f']['img1.jpg'];
        expectedResult['f']['img2.jpg'] = firstTree['f']['img2.jpg'];
        expectedResult['f']['g'] = new ContentTree('g');
        expectedResult['f']['g'].parent = expectedResult['f'];
        expectedResult['f']['g']['h.png'] = secondTree['f']['g']['h.png'];
        (expectedResult._ as ContentTreeGroups).fakes = [
            firstTree['index.md'],
            secondTree['style.css']
        ];
        (expectedResult._ as ContentTreeGroups).directories = [
            expectedResult['d'], 
            expectedResult['e'],
            expectedResult['f']
        ];
        (expectedResult['d']._ as ContentTreeGroups).fakes = [ firstTree['d']['index.md'] ];
        (expectedResult['e']._ as ContentTreeGroups).fakes = [ secondTree['e']['f1.md'] ];
        (expectedResult['f']._ as ContentTreeGroups).fakes = [ firstTree['f']['img1.jpg'], firstTree['f']['img2.jpg'] ];
        (expectedResult['f']._ as ContentTreeGroups).directories = [ expectedResult['f']['g'] ];
        (expectedResult['f']['g']._ as ContentTreeGroups).fakes = [ expectedResult['f']['g']['h.png'] ];

        ContentTree.merge(firstTree, secondTree);

        expectEquivalentTrees(firstTree, expectedResult);
    });

    test('merge() does not mutate its second parameter', () => {
        const firstTree = new ContentTree('firstTree');
        firstTree['index.md'] = new FakePlugin('index.md');
        firstTree['d'] = new ContentTree('d');
        firstTree['d'].parent = firstTree;
        firstTree['d']['index.md'] = new FakePlugin('index.md');
        firstTree['f'] = new ContentTree('f');
        firstTree['f'].parent = firstTree;
        firstTree['f']['img1.jpg'] = new FakePlugin('img1.jpg');
        firstTree['f']['img2.jpg'] = new FakePlugin('img2.jpg');
        (firstTree._ as ContentTreeGroups).fakes = [ 
            firstTree['index.md'], 
        ];
        (firstTree._ as ContentTreeGroups).directories = [ firstTree['d'], firstTree['f'] ];
        (firstTree['d']._ as ContentTreeGroups).fakes = [ firstTree['d']['index.md'] ];
        (firstTree['f']._ as ContentTreeGroups).fakes = [ 
            firstTree['f']['img1.jpg'], 
            firstTree['f']['img2.jpg'] 
        ];

        const secondTree = new ContentTree('secondTree');
        secondTree['style.css'] = new FakePlugin('style.css');
        secondTree['e'] = new ContentTree('e');
        secondTree['e'].parent = secondTree;
        secondTree['e']['f1.md'] = new FakePlugin('f1.md');
        secondTree['f'] = new ContentTree('f');
        secondTree['f'].parent = secondTree;
        secondTree['f']['g'] = new ContentTree('g');
        secondTree['f']['g'].parent = secondTree['f'];
        secondTree['f']['g']['h.png'] = new FakePlugin('h.png');
        (secondTree._ as ContentTreeGroups).fakes = [
            secondTree['style.css'],
        ];
        (secondTree['e']._ as ContentTreeGroups).fakes = [ secondTree['e']['f1.md'] ];
        (secondTree._ as ContentTreeGroups).directories = [
            secondTree['e'],
            secondTree['f'],
        ];
        (secondTree['f']._ as ContentTreeGroups).directories = [ secondTree['f']['g'] ];
        (secondTree['f']['g']._ as ContentTreeGroups).fakes = [ secondTree['f']['g']['h.png'] ];

        const expectedResult = partialDeepCloneTree(secondTree);

        ContentTree.merge(firstTree, secondTree);

        expectEquivalentTrees(expectedResult, secondTree);
    });

    test('Does not mutate tree if second parameter is null', () => {
        const firstTree = new ContentTree('firstTree');
        firstTree['index.md'] = new FakePlugin('index.md');
        firstTree['d'] = new ContentTree('d');
        firstTree['d'].parent = firstTree;
        firstTree['d']['index.md'] = new FakePlugin('index.md');
        firstTree['f'] = new ContentTree('f');
        firstTree['f'].parent = firstTree;
        firstTree['f']['img1.jpg'] = new FakePlugin('img1.jpg');
        firstTree['f']['img2.jpg'] = new FakePlugin('img2.jpg');
        (firstTree._ as ContentTreeGroups).fakes = [ 
            firstTree['index.md'], 
        ];
        (firstTree._ as ContentTreeGroups).directories = [ firstTree['d'], firstTree['f'] ];
        (firstTree['d']._ as ContentTreeGroups).fakes = [ firstTree['d']['index.md'] ];
        (firstTree['f']._ as ContentTreeGroups).fakes = [ 
            firstTree['f']['img1.jpg'], 
            firstTree['f']['img2.jpg'] 
        ];
        const expectedResult = partialDeepCloneTree(firstTree);

        ContentTree.merge(firstTree, null as unknown as ContentTree);

        expectEquivalentTrees(expectedResult, firstTree);
    });
});

describe('loadContent() tests', () => {
    test('loadContent() instantiates correct plugin instance for filename', async () => {
        
        class WrongPlugin extends FakePlugin {
            get name() {
                return 'WrongPlugin';
            }
        }
        
        const testFilepath = { full: '/www/content/file.md', relative: 'content/file.md' };
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.registerContentPlugin('fakes', '**/*.md', FakePlugin);
        fakeEnvironment.registerContentPlugin('fakes', '**/*.css', WrongPlugin);

        const testOutput = await loadContent(fakeEnvironment, testFilepath);

        expect(testOutput).toBeInstanceOf(FakePlugin);
    });

    test('loadContent() sets correct plugin properties', async () => {
        const testFilepath = { full: '/www/content/file.md', relative: 'content/file.md' };
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.registerContentPlugin('fakes', '**/*.md', FakePlugin);
        
        const testOutput = await loadContent(fakeEnvironment, testFilepath);

        expect(testOutput.__env).toBe(fakeEnvironment);
        expect(testOutput.__plugin).toStrictEqual({
            name: 'FakePlugin',
            group: 'fakes',
            pattern: '**/*.md',
            class: FakePlugin
        });
        expect(testOutput.__filename).toBe(testFilepath.full);
    });

    test('If multiple plugins can match the same pattern, loadContent() instantiates the most recently-registered one', async () => {
        
        class WrongPlugin extends FakePlugin {
            get name() {
                return 'WrongPlugin';
            }
        }
        
        const testFilepath = { full: '/www/content/file.md', relative: 'content/file.md' };
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.registerContentPlugin('fakes', '**/*.md', WrongPlugin);
        fakeEnvironment.registerContentPlugin('fakes', '**/*.md', FakePlugin);

        const testOutput = await loadContent(fakeEnvironment, testFilepath);

        expect(testOutput).toBeInstanceOf(FakePlugin);
    });

    test('loadContent() throws error if matched plugin\'s fromFile() function throws error', async () => {

        class BrokenPlugin extends FakePlugin {
            static fromFile() {
                return Promise.reject(new Error('Fake error'));
            }
        }

        const testFilepath = { full: '/www/content/file.md', relative: 'content/file.md' };
        const fakeEnvironment = new FakeEnvironment();
        fakeEnvironment.registerContentPlugin('fakes', '**/*.md', BrokenPlugin);

        await expect(async () => await loadContent(fakeEnvironment, testFilepath)).rejects.toThrowError();
    });
});
