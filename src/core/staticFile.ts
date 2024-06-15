import * as fs from 'node:fs';

import ContentPlugin, { ContentPluginDef } from './contentPlugin.js';
import { FilePath, } from './coreTypes.js';

// The base fallback plugin for content files whose filenames don't match any of the registered plugins.
// Returns the content file unchanged.
export default class StaticFile extends ContentPlugin {
    
    filepath: FilePath;

    constructor(filepath: FilePath) {
        super();
        this.filepath = filepath;
    }

    get name() {
        return 'StaticFile';
    }

    get view() {
        return async () => {
            try {
                return fs.createReadStream(this.filepath.full);
            } catch (error) {
                throw new Error(`Error creating file read stream: ${error.message}`);
            }
        };
    }

    get filename() {
        return this.filepath.relative;
    }

    get pluginColour() {
        return 'none';
    }

    static async fromFile(filepath: FilePath) {
        return new StaticFile(filepath);
    }
}

// Because this is the fallback plugin, it isn't registered in the environment in the usual way.  Instead, this
// plugindef is used if the environment cannot find a plugin for a file.
export const defaultPluginDef: ContentPluginDef = {
    name: 'StaticFile',
    group: 'files',
    pattern: '',
    class: StaticFile
};
