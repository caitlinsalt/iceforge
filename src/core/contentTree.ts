import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { setImmediate } from 'node:timers/promises';
import chalk from 'chalk';
import { minimatch } from 'minimatch';

import { IContentTree, ContentTreeGroups, FilePath, IEnvironment, Indexable, ContentTreeNode } from './coreTypes.js';
import { minimatchOptions } from './config.js';
import ContentPlugin from './contentPlugin.js';
import { logger } from './logger.js';
import { defaultPluginDef } from './staticFile.js';

type indexableChalk = {
    [index: string]: ((s: string) => string);
}

// This class represents non-leaf nodes in the content tree, including the root node.  It is slightly unusual:
// each enumerable property of the instance represents a node in the next level of the tree.  Because of this, all 
// of the statically-defined properties of the class are defined using Object.defineProperty() to make them 
// non-enumerable.
export default class ContentTree implements IContentTree {

    [index: string]: IContentTree | ContentPlugin | ContentTreeGroups | string[];

    // filename may be either a directory name, or the property name of this node in the parent node.
    constructor(filename: string, groupnames: string[] = []) {
        let parent: ContentTree | null = null;
        const groups: ContentTreeGroups = {
            directories: [],
            files: [],
        };

        // An array of the indexable properties of the _ property, other than the predefined
        // _.directories and _.files properties.
        Object.defineProperty(this, '__groupnames', { get: () => groupnames });

        // The child nodes in the next level of the tree, categorised by their plugin group.
        // Child nodes that are content tree instances representing subdirectories are categorised
        // under _.directories
        Object.defineProperty(this, '_', { get: () => groups });

        // Contains the property name in the parent node which references this node. If this object was 
        // created by ContentTree.fromDirectory(), this is also the name of the directory this object was
        // created from.
        Object.defineProperty(this, 'filename', { get: () => filename });

        // Indicates which (if any) child node should be regarded as the "index page" of this node.  This will
        // be the first child node added whose name starts with 'index.'
        Object.defineProperty(this, 'index', { get: () => {
            for (const key of Object.keys(this)) {
                if (key.startsWith('index.')) {
                    const inst = this as Indexable;
                    return inst[key];
                }
            }
        }});

        // The parent node of this node.
        Object.defineProperty(this, 'parent', { get: () => parent, set: (val?: ContentTree) => parent = val });

        // This property is always false, even for nodes with no children.  The rest of the application treats leaf nodes as 
        // content plugins, and non-leaf nodes as walkable nodes.
        Object.defineProperty(this, 'isLeaf', { get: () => false });
    }

    // Create a content tree recursively from a directory and its subdirectories.
    static async fromDirectory(env: IEnvironment, directory: string): Promise<IContentTree> {
        const reldir = env.relativeContentsPath(directory);
        const tree = new ContentTree(reldir, env.getContentGroups()) as IContentTree;
                
        // Convert the array of filenames returned by fs.readDir to an array of FilePath instances.
        const resolveFilenames = (filenames: string[]): FilePath[] => {
            filenames.sort();
            return filenames.map(n => {
                const relname = path.join(reldir, n);
                return {
                    full: path.join(env.contentsPath, relname),
                    relative: relname,
                };
            });
        };

        // Filter an array of FilePath instances, removing any file paths which match any of the glob
        // patterns in the env.config.ignore array.
        const filterIgnored = (filenames: FilePath[]): FilePath[] => {
            if (env.config.ignore.length > 0) {
                return filenames.filter(f => 
                    !(env.config.ignore.some(p => {
                        const ignore = minimatch(f.relative, p, minimatchOptions);
                        if (ignore) {
                            env.logger.verbose(`Ignoring ${f.relative} (matches ${p})`);
                        }
                        return ignore;
                    })));
            } else {
                return filenames;
            }
        };

        // Create a ContentTree object and add child nodes to it based on the contents of a directory.
        // For subdirectories, call ContentTree.fromDirectory recursively.
        const createInstance = async (filepath: FilePath): Promise<void> => {
            await setImmediate();
            const stats = await fs.stat(filepath.full);
            const basename = path.basename(filepath.relative);
            if (stats.isDirectory()) {
                const result = await ContentTree.fromDirectory(env, filepath.full) as IContentTree;
                result.parent = tree;
                tree[basename] = result;
                tree._.directories.push(result);
            } else if (stats.isFile()) {
                const instance = await loadContent(env, filepath);
                instance.parent = tree;
                tree[basename] = instance;
                if (!Object.hasOwn(tree._, instance.__plugin.group)) {
                    tree._[instance.__plugin.group] = [];
                }
                (tree._[instance.__plugin.group] as ContentPlugin[]).push(instance);
            }
            return;
        };

        // Map createInstance() over a list of file paths, and wait for all to complete.
        const createInstances = async (filenames: FilePath[]): Promise<void> => {
            await Promise.all(filenames.map(async (f) => createInstance(f)));
        };
                
        const dirContents = await fs.readdir(directory);
        const filenames = resolveFilenames(dirContents);
        const filteredFilenames = filterIgnored(filenames);
        await createInstances(filteredFilenames);
        return tree;
    }

    // Pretty-print the details of a content tree's contents.  This is called recursively, so
    // the depth parameter is used to control output indentation.
    //
    // This routine assumes that all nodes where isLeaf is false are ContentTree instances, and that
    // all nodes where isLeaf is true have pluginColour and pluginInfo properties.
    static inspect(treenode: IContentTree | number, depth = 0): string {
        if (typeof treenode === 'number') {
            return '[object: ContentTree]';
        }
        const rv: string[] = [];
        let pad = '';
        if (depth > 0) {
            pad = ' '.repeat(depth);
        }
        const keys = Object.keys(treenode);
        keys.sort((a, b) => {
            const ad = treenode[a] instanceof ContentTree;
            const bd = treenode[b] instanceof ContentTree;
            if (ad !== bd) {
                return bd ? 1 : -1;
            }
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        for (const k of keys) {
            const v = treenode[k];
            let s = '';
            if (v instanceof ContentTree) {
                s = `${chalk.bold(k)}/\n${ContentTree.inspect(v as IContentTree, depth + 1)}`;
            } else {
                let colourFn = (s: string) => s;
                let itemInfo = '';
                if ((v as ContentTreeNode).isLeaf) {
                    const thePlugin = v as ContentPlugin;
                    if (thePlugin.pluginColour !== 'none') {
                        colourFn = (chalk as unknown as indexableChalk)[thePlugin.pluginColour];
                        if (!colourFn) {
                            throw new Error(`Plugin ${k} specifies invalid plugin colour ${thePlugin.pluginColour}`);
                        }
                    }
                    itemInfo = thePlugin.pluginInfo;
                } else if (typeof v === 'string') {
                    itemInfo = v;
                }
                if (itemInfo) {
                    s = `${colourFn(k)} (${chalk.grey(itemInfo)})`;
                }
            }
            rv.push(pad + s);
        }
        return rv.join('\n');
    }

    // Flatten a content tree, returning an array of the tree nodes where isLeaf is true.
    static flatten(tree: IContentTree | IContentTree[]): ContentPlugin[] {
        let rv: ContentPlugin[] = [];
        if (tree instanceof ContentTree) {
            const contentTree = tree as IContentTree;
            for (const k of Object.keys(contentTree)) {
                if (contentTree[k] instanceof ContentTree) {
                    rv = rv.concat(ContentTree.flatten(contentTree[k] as IContentTree));
                }
                else if ((contentTree[k] as ContentTreeNode).isLeaf) {
                    rv.push(contentTree[k] as ContentPlugin);
                }
            }
        } else {
            (tree as IContentTree[]).forEach(t => rv = rv.concat(ContentTree.flatten(t)));
        }
        return rv;
    }

    // Merge two content trees recursively from their roots, mutating the first.
    // This routine throws an error if it encounters a non-leaf node that is not a ContentTree instance.
    static merge(root: IContentTree, tree: IContentTree): void {
        for (const k of Object.keys(tree)) {
            if ((tree[k] as ContentTreeNode).isLeaf) {
                const item = tree[k] as ContentPlugin;
                root[k] = item;
                item.parent = root;
                if (!Object.hasOwn(root._, item.__plugin.group)) {
                    root._[item.__plugin.group] = [];
                }
                (root._[item.__plugin.group] as ContentPlugin[]).push(item);
            } else if (tree[k] instanceof ContentTree) {
                const item = tree[k] as IContentTree;
                if (!root[k]) {
                    const newItem = new ContentTree(k, item.__groupnames);
                    root[k] = newItem;
                    newItem.parent = root;
                    root._.directories.push(newItem);
                } 
                if (root[k] instanceof ContentTree) {
                    ContentTree.merge(root[k] as IContentTree, item);
                }
            } else {
                logger.error('Found a non-leaf content tree node which is not a ContentTree instance.');
            }
        }
    }
}

// Create a content plugin to handle a given file.  This function will try to instantiate the latest-registered plugin which has registered to
// handle the specified file path.
export const loadContent = async (env: IEnvironment, filepath: FilePath): Promise<ContentPlugin> => {
    
    const plugin = [...env.contentPlugins].reverse().find(pd => minimatch(filepath.relative, pd.pattern, minimatchOptions)) || defaultPluginDef;
    
    try {
        const instance = await plugin.class.fromFile(filepath);
        instance.__env = env;
        instance.__plugin = plugin;
        instance.__filename = filepath.full;
        return instance;
    } catch (error) {
        error.message = `${filepath.relative}: ${error.message}`;
        throw error;
    }
};
