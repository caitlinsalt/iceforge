import * as winston from 'winston';
import { transports } from '../core/logger';

export const testLogger = winston.createLogger({
    exitOnError: true,
    transports: transports,
    silent: true
});
