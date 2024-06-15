import * as fs from 'node:fs/promises';
import { ensureDir } from 'fs-extra';
import { pipeline } from 'node:stream/promises';
import ContentPlugin from './contentPlugin.js';
import ContentTree from './contentTree.js';
import { IContentTree, IEnvironment, TemplateMap, LocalMap, RenderedData } from './coreTypes.js';
import path from 'node:path';
import { ReadStream, WriteStream } from 'node:fs';

// Render the view requested by a plugin.  The plugin can either define its own view, or request a view plugin by name.
export async function renderView(env: IEnvironment, content: ContentPlugin, locals: LocalMap, contentTree: IContentTree, templates: TemplateMap): Promise<RenderedData> {
    const _locals = { env, contents: contentTree, ...locals };
    const theView = typeof content.view === 'string' ? env.views[content.view] : content.view;
    if (!theView) {
        throw new Error(`Content ${content.filename} specifies unknown view ${content.view}`);
    }
    return await theView(env, _locals, contentTree, templates, content);
}

// Utility function to write a buffer to a stream in an awaitable fashion.
const writeBuffer = async (writeable: WriteStream, output: Buffer): Promise<void> => {
    return new Promise((resolve, reject) => {
        writeable.end(output);
        writeable.on('finish', () => { resolve(); });
        writeable.on('error', () => { reject(); });
    });
};

// Render the content tree.  This function flattens the content tree, calls renderView() for each plugin in the flattened tree, and writes the rendered output to files.
export default async function render(env: IEnvironment, outputDir: string, contentTree: IContentTree, templates: TemplateMap, locals: LocalMap): Promise<void> {
    env.logger.info(`Rendering tree:\n${ContentTree.inspect(contentTree, 1)}\n`);
    env.logger.verbose(`Render to output directory ${outputDir}`);

    const renderPlugin = async (content: ContentPlugin): Promise<boolean> => {
        const renderOutput = await renderView(env, content, locals, contentTree, templates);
        if (renderOutput instanceof ReadStream || renderOutput instanceof Buffer) {
            const destination = path.join(outputDir, content.filename);
            env.logger.verbose(`Writing content ${content.getUrl()} to ${destination}`);
            await ensureDir(path.dirname(destination));
            const fd = await fs.open(destination, 'w');
            const writeStream = fd.createWriteStream();
            if (renderOutput instanceof ReadStream) {
                await pipeline(renderOutput, writeStream);
            } else {
                await writeBuffer(writeStream, renderOutput);
            }
            return true;
        }
        env.logger.verbose(`Skipping ${content.getUrl()}`);
        return false;
    };

    const items = ContentTree.flatten(contentTree);
    for (const item of items) {
        await renderPlugin(item);
    }
}
