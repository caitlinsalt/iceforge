import { defaultConfig } from '../core/config.js';
import { CommonOptions } from '../core/coreTypes.js';
import logger from '../core/logger.js';
import { commonOptions, commonUsage, extendOptions, loadEnv } from './common.js';

// Module implementing the preview server.
// The code is essentially a wrapper around Environment.preview(), which in turn is a wrapper
// around the functions in server.ts

export const usage = `
Usage: iceforge preview [options]

Options:

  -p, --port [port]             Port to run server on (default to ${defaultConfig.port})
  -H, --hostname                Host address to bind server to (defaults to INADDR_ANY)
  -d, --minRegenerationDelay    Only rerun generators after this period has elapsed (seconds, defaults to 5)
  ${commonUsage}

  Options can also be set in the config file.

Examples:

  Preview using the file ./config.json as the configuation
  $ iceforge preview

`;

export const options = {
    string: ['port', 'hostname', 'minRegenerationDelay'],
    alias: {
        port: 'p',
        hostname: 'H',
        minRegenerationDelay: 'd'
    },
    defaults: {
        minRegenerationDelay: '5'
    }
};

interface PreviewOpts extends CommonOptions {
    hostname: string
}

extendOptions(options, commonOptions);

const preview = async (options: PreviewOpts): Promise<void> => {
    logger.info ('Starting preview server...');
    const env = await loadEnv(options);
    await env.preview();
};

export default preview;
