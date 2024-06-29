import { Opts } from 'minimist';
import path from 'node:path';

import { CommonOptions, IEnvironment, Indexable } from '../core/coreTypes.js';
import logger from '../core/logger.js';
import { fileExists } from '../core/utils.js';
import Config, { defaultConfig } from '../core/config.js';
import Environment from '../core/environment.js';

// Module containing utility functions, mostly those used by multiple command verbs.

// Command line options shared across multiple verbs.
export const commonOptions = {
    string: [
        'chdir',
        'config',
        'contents',
        'templates',
        'locals',
        'imports',
        'require',
        'plugins',
        'ignore'
    ],
    default: {
        chdir: '',
        config: './config.json',
        contents: defaultConfig.contents,
        templates: defaultConfig.templates
    },
    alias: {
        config: 'c',
        chdir: 'C',
        contents: 'i',
        templates: 't',
        locals: 'L',
        imports: 'M',
        require: 'R',
        plugins: 'p',
        ignore: 'I'
    }
};

// A standard usage message for the common options shared across multiple verbs, to be inserted into those verbs' usage messages at the appropriate point
export const commonUsage = 
`-C, --chdir [path]        Change the working directory to [path].
  -c, --config [path]       Path to config (defaults to ${commonOptions.default.config}).
  -i, --contents [path]     Path to contents location (defaults to ${commonOptions.default.contents}).
  -t, --templates [path]    Path to template location (defaults to ${commonOptions.default.templates}).
  -L, --locals [path]       Optional path to JSON file containing template context data.
  -M, --imports [list]       Comma-separated list of additional modules to import into the template context, in alias:module format.
  -R, --require [list]      Synonym for --import
  -P, --plugins             Comma-separated list of modules to load as plugins.
  -I, --ignore              Comma-separated list of filenames or filename glob patterns to ignore.
`;

// Merge two sets of command line options, mutating the first.
export const extendOptions = (base: Opts, extra: Opts) => {
    if (!base.string) {
        base.string = [];
    }
    if (extra.string) {
        base.string = base.string.concat(...extra.string);
    }
    if (!base.boolean) {
        base.boolean = [];
    }
    if (extra.boolean) {
        base.boolean = (base.boolean as string[]).concat(...(extra.boolean as string[]));
    }
    if (extra.alias) {
        base.alias = { ...base.alias, ...extra.alias };
    }
    if (extra.default) {
        base.default = { ...base.default, ...extra.default };
    }
};

// Load the configuration, override it with command-line options as needed, and create
// the Iceforge environment.
export const loadEnv = async (options: CommonOptions) : Promise<IEnvironment> => {
    const workDir = path.resolve(options.chdir || process.cwd());
    logger.verbose(`Creating environment.  Work directory is ${workDir}`);
    const configPath = path.join(workDir, options.config);
    let config;
    if (await fileExists(configPath)) {
        logger.info(`Using config file ${configPath}`);
        config = await Config.fromFile(configPath);
    } else {
        logger.verbose('No config file found');
        config = new Config();
    }

    // Override config file with command line options
    const exclude = ['_', 'chdir', 'config', 'clean'];
    let key: keyof CommonOptions;
    for (key in options) {
        let value;
        if (exclude.includes(key)) {
            continue;
        }
        if (key === 'port') {
            value = Number(options[key]);
        } else if (['ignore', 'imports', 'require', 'plugins'].includes(key)) {
            value = (options[key] as string).split(',');
            if (['imports', 'require'].includes(key)) {
                const reqs : Indexable = {};
                for (const v of value) {
                    let [alias, module] = v.split(':');
                    if (!module) {
                        module = alias;
                        alias = module.replace(/\/$/, '').split('/').slice(-1)[0];
                    }
                    reqs[alias] = module;
                }
                value = reqs;
            }
        } else {
            value = options[key];
        }
        config[key] = value;
    }

    return await Environment.create(config, workDir, logger);
};

// Try to find a location for per-user Iceforge files.  The following locations are searched and the first
// extant value is used:
// - the value of the environment variable $ICEFORGE_PATH
// - the location $HOME/.iceforge
// - the location $USERPROFILE/.iceforge
//
// The validity of the value is not checked, so if an earlier potential value is set to an invalid value, the program will not
// use a later, valid value instead.
//
// At present this function is only used by the `iceforge new` command to look for site templates other than those shipped
// with Iceforge.
export const getStoragePath = () => {
    if (process.env['ICEFORGE_PATH']) {
        return process.env['ICEFORGE_PATH'];
    }
    const home = process.env['HOME'] || process.env['USERPROFILE'];
    const dir = '.iceforge';
    return path.resolve(home, dir);
};
