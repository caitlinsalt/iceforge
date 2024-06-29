import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringMap } from '../core/coreTypes.js';
import { fileExists } from '../core/utils.js';
import * as fs from 'fs/promises';
import { ParsedArgs } from 'minimist';
import * as fse from 'fs-extra';
import logger from '../core/logger.js';
import { spawn } from 'node:child_process';
import { getStoragePath } from './common.js';

// Module implementing the new command.

export const siteTemplates: StringMap = { };

const loadSiteTemplates = async (directory: string) => {
    if (!(await fileExists(directory))) {
        return;
    }
    let dirs = await fs.readdir(directory);
    dirs = dirs.map(fn => path.join(directory, fn));
    const areDirsReallyDirs = await Promise.all(dirs.map((dir) => fs.stat(dir)));
    dirs = dirs.filter((dir, idx) => areDirsReallyDirs[idx].isDirectory);
    dirs.forEach(dir => siteTemplates[path.basename(dir)] = dir);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
await loadSiteTemplates(path.join(__dirname, '../../examples'));
await loadSiteTemplates(path.join(getStoragePath(), 'templates/'));

export const usage = `
Usage: iceforce new [options] <path>

Creates a skeleton site in <path>.

Options:
  -f, --force               Overwrite existing files.
  -T, --template <name>     Template to use when creating new site.  Default value is "blog".

  The available templates are ${Object.keys(siteTemplates).join(', ')}.

Examples:

  Create a new blog site in the 'my-blog' directory in your home directory:
  $ iceforge new ~/my-blog

  Create a new webapp site in /var/www/newsite:
  $ iceforge new -T webapp /var/www/newsite
`;

export const options = {
    string: ['template'],
    boolean: ['force'],
    alias: {
        template: 'T',
        force: 'f'
    },
    default: {
        template: 'blog'
    }
};

interface NewOpts extends ParsedArgs {
    template?: string,
    force?: boolean;
}

// Check for the existence of the template, copy the template's contents into the site folder, and run "npm install" inside the site folder.
const createSite = async (argv: NewOpts) => {
    const location = argv._[3];
    if (!location) {
        logger.error('You must specify a location.');
        return;
    }

    if (!siteTemplates[argv.template]) {
        logger.error(`Unknown template ${argv.template}`);
        return;
    }

    const source = siteTemplates[argv.template];
    const dest = path.resolve(location);

    logger.info(`Initialising new Iceforge site in ${dest} using template ${argv.template}`);

    const validateDestination = async () => {
        logger.verbose(`Checking validity of target path '${dest}'.`);
        if (await fileExists(dest) && !argv.force) {
            throw new Error(`Target path '${dest}' already exists.  Use the --force option to force installation into it.`);
        }
    };

    const copyTemplate = async () => {
        logger.verbose(`Recursively copying ${source} to ${dest}`);
        await fse.copy(source, dest);
    };

    const installDependencies = async () => {
        const packagePath = path.join(dest, 'package.json');
        if (await fileExists(packagePath)) {
            logger.verbose('Installing template dependencies');
            const npm = spawn('npm', ['install'], { cwd: dest, shell: true });
            npm.stdout.on('data', (data) => {
                if (data) {
                    if (typeof data === 'string' && data.startsWith('npm warn')) {
                        logger.warn(data);
                    } else {
                        logger.verbose(data);
                    }
                }
            });
            npm.stderr.on('data', (data) => {
                if (data) {
                    logger.warn(data);
                }
            });
            await new Promise<void>((resolve) => {
                npm.on('exit', () => {
                    resolve();
                });
            });
        }
    };

    try {
        await validateDestination();
    } catch (error) {
        logger.error(error.message, error);
        process.exit(1);
    }

    await copyTemplate();
    await installDependencies();
    logger.info('Done!');
};

export default createSite;
