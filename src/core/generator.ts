import ContentPlugin from './contentPlugin.js';
import ContentTree from './contentTree.js';
import { IContentTree, ContentTreeNode, GeneratorDef, IEnvironment } from './coreTypes.js';

// Run a generator function and returns the (partial) content tree that it generates.
// Generator functions should return a tree containing only the new content they want to add to the primary tree which they
// receive as a parameter.  Trees are not merged until all generators have run, and in the preview server generators are 
// run in parallel so generators cannot depend on content created by a previous generator.
export default async function runGenerator(env: IEnvironment, contents: IContentTree, generator: GeneratorDef): Promise<IContentTree> {
    const groups = env.getContentGroups();

    const resolve = (root: IContentTree, items: IContentTree) => {
        if (typeof items === 'undefined') {
            return;
        }
        for (const key of Object.keys(items)) {
            const item = items[key];
            if (item) {
                const nodeItem = item as ContentTreeNode;
                if (nodeItem.isLeaf) {
                    const pluginItem = item as ContentPlugin;
                    pluginItem.parent = root;
                    pluginItem.__env = env;
                    pluginItem.__filename = 'generator';
                    pluginItem.__plugin = generator;
                    root[key] = item;
                    if (!root._[generator.group]) {
                        root._[generator.group] = [];
                        if (!(generator.group in root.__groupnames)) {
                            root.__groupnames.push(generator.group);
                        }
                    }
                    root._[generator.group].push(pluginItem);
                } else if (item) {
                    const branchItem = item as IContentTree;
                    const tree = new ContentTree(key, groups);
                    tree.parent = root;
                    tree.parent._.directories.push(branchItem);
                    root[key] = tree;
                    resolve(tree, branchItem);
                }
            }
        }
    };

    const generated = await generator.fn(contents);
    const tree = new ContentTree('', groups);
    resolve(tree, generated);
    return tree;
}