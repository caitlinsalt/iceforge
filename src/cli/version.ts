import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from '../core/utils.js';

// Module that implements the --version option-verb.

// Print out the version number, by parsing package.json to find it.
const version = async () : Promise<string> => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageFile = await readJson(path.join(__dirname, '../../package.json'));
    return packageFile.version;
};

export default version;
