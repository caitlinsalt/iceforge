import fse from 'fs-extra';
import chalk from 'chalk';

import { commonOptions, commonUsage, extendOptions, loadEnv } from './common.js';

import { logger } from '../core/logger.js';
import { CommonOptions, IEnvironment } from '../core/coreTypes.js';
import { fileExists } from '../core/utils.js';

// Module implementing the "build" verb.

export const usage = `
Usage: iceforge build [options]

Options:

  -o, --output [path]       Directory to write build output to (defaults to ./build).
  -X, --clean               Clear output directory before building.
  ${commonUsage}

  All options can also be set in the config file.

Examples:

  Build using the config file config.json in the current directory:
  $ iceforge build

  Build using command line options:
  $ iceforge build -o /var/www/public -T extra-data.json -C ~/my-site

  Build using custom config file, into a clean build directory:
  $ iceforge build --config alt-config.json --clean
`;

export const options = {
    boolean: ['clean'],
    string: ['output'],
    alias: {
        output: 'o',
        clean: 'X'
    }
};

interface BuildOpts extends CommonOptions {
    clean: boolean;
    output: string;
}

extendOptions(options, commonOptions);

// Load the environment; clear or create the output directory; and build the site.
// Finally, print the elapsed time.
const build = async (options: BuildOpts) : Promise<void> => {
    const start = Date.now();
    logger.info('Building site...');

    const prepareOutputDir = async (env: IEnvironment) => {
        const outputDir = env.resolvePath(env.config.output);
        logger.info(`Output dir is ${outputDir}`);
        if (await fileExists(outputDir)) {
            if (!options.clean) {
                return;
            }
            logger.verbose(`Cleaning ${outputDir}`);
        } else {
            logger.verbose(`Creating directory ${outputDir}`);
        }
        await fse.emptyDir(outputDir);
    };

    const env = await loadEnv(options);
    await prepareOutputDir(env);
    await env.build();
    const stop = Date.now();
    const delta = stop.valueOf() - start.valueOf();
    logger.info(`Done in ${chalk.bold(delta)}ms\n`);
    process.exit(0);
};

export default build;
