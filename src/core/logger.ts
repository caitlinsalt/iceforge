import * as winston from 'winston';
import chalk from 'chalk';
import * as util from 'node:util';
import { ILoggable, ILoggerOptions } from './coreTypes.js';

// Console logging utility class.
class cli extends winston.transports.Console {
    
    quiet: boolean;

    name = 'cli';

    constructor(options: ILoggerOptions) {
        super(options);
        this.quiet = options.quiet || false;
    }

    log(info: ILoggable, callback: (error: Error | null, state: boolean) => void) {
        const { level: messageLevel, message, meta = {} } = info;
        if (messageLevel === 'error') {
            process.stderr.write(`\n ${chalk.red('error')} ${message}\n`);
            if (this.level === 'verbose') {
                if (meta.stack) {
                    const stack = meta.stack.substring(meta.stack.indexOf('\n') + 1);
                    process.stderr.write(stack + '\n\n');
                }
                Object.keys(meta).forEach(k => {
                    if (k !== 'stack' && k !== 'message') {
                        const pval = util.inspect(meta[k], false, 2, true).replace(/\n/g, '\n    ');
                        process.stderr.write(`    ${k}: ${pval}\n`);
                    }
                });
            } else {
                process.stderr.write('\n');
            }
        } else if (!this.quiet) {
            let formattedMessage = message;
            if (messageLevel !== 'info') {
                const colour = messageLevel === 'warn' ? 'yellow' : 'grey';
                formattedMessage = `${chalk[colour](messageLevel)} ${message}`;
            }
            if (Object.keys(meta).length > 0) {
                formattedMessage += util.format(' %j', meta);
            }
            process.stdout.write(`  ${formattedMessage}\n`);
        }

        this.emit('logged');
        callback(null, true);
    }   
}

export const transports = [
    new cli({
        level: 'info',
    }),
];

export const logger = winston.createLogger({
    exitOnError: true,
    transports: transports,
});
