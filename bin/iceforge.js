#!/usr/bin/env node

import main from '../dist/cli/index.js';
import process from 'node:process';

await main(process.argv);
