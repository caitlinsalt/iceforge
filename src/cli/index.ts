import chalk from 'chalk';
import parseArgv from 'minimist';

import version from './version.js';
import { extendOptions } from './common.js';
import logger from '../core/logger.js';

const usage = `
Usage: iceforge [options] [command]

Commands:

  ${chalk.bold('build')} [options]      Build a site.
  ${chalk.bold('preview')} [options]    Run local preview server.
  ${chalk.bold('new')} <location>       Create a new site.
  ${chalk.bold('plugin')}               Manage plugins.

  Each command has a --help option for further information.

Global options:

  -v, --verbose   Show debug information.
  -q, --quiet     Only output critical errors.
  -V, --version   Output version number, and exit.
  -h, --help      Show this message, or help for an individual command.

`;

const globalOptions = {
    boolean: ['verbose', 'quiet', 'version', 'help'],
    alias: {
        verbose: 'v',
        quiet: 'q',
        version: 'V',
        help: 'h'
    }
};

// The Iceforge CLI entry point.  It expects the second item on the command line to be a verb
// from a small number of valid commands.  If the verb is valid, it loads the module whose name matches
// the command and calls that module's default export, after handling the options to set logging level or
// display one of the help messages.
const main = async (argv: string[]) => {
    const opts = parseArgv(argv, globalOptions);
    const cmd = opts._[2];

    const handleVersion = async () => {
        console.log(await version());
    };

    const runCommand = async (cmd: string) => {
        const cmdModule = await import(/* @vite-ignore */`./${cmd}.js`);
        const cmdFunc = cmdModule.default;

        if (opts.help) {
            console.log(cmdModule.usage ? cmdModule.usage : usage);
        } else {
            if (opts.verbose) {
                logger.transports[0].level = 'verbose';
            }

            if (opts.quiet) {
                logger.transports[0].level = 'critical';
            }

            extendOptions(cmdModule.options, globalOptions);
            const cmdOpts = parseArgv(argv, cmdModule.options);
            await cmdFunc(cmdOpts);
        }
    };

    const validateAndRunCommand = async (cmd: string) => {
        const validCommands = ['build', 'new', 'preview'];

        if (!cmd) {
            console.log(usage);
        } else {
            if (!validCommands.includes(cmd)) {
                console.error('Invalid command');
                console.log(usage);
                process.exit(1);
            } else {
                await runCommand(cmd);
            }
        }
    };

    if (opts.version) {
        await handleVersion();
    } else {
        await validateAndRunCommand(cmd);
    }
};

export default main;
