import { SpawnOptionsWithoutStdio } from 'node:child_process';
import { EventEmitter } from 'node:stream';

export default class FakeProcess extends EventEmitter {

    commandName: string;

    commandArgs: readonly string[];

    commandOptions: SpawnOptionsWithoutStdio;

    standardOutputText: string;

    standardErrorText: string;

    delay: number;

    stdout: EventEmitter;

    stderr: EventEmitter;

    constructor(commandName: string, commandArgs: readonly string[], options: SpawnOptionsWithoutStdio, standardOutput: string, errorOutput: string, delay: number) {
        super();
        this.commandName = commandName;
        this.commandArgs = commandArgs;
        this.commandOptions = options;
        this.standardOutputText = standardOutput;
        this.standardErrorText = errorOutput;
        this.delay = delay;
        this.stdout = new EventEmitter();
        this.stderr = new EventEmitter();
    }

    sleep(secs: number) {
        return new Promise(r => setTimeout(r, secs * 1000));
    }

    async run() {
        await this.sleep(this.delay);
        if (this.standardOutputText) {
            this.stdout.emit('data', this.standardOutputText);
        }
        if (this.standardErrorText) {
            this.stderr.emit('data', this.standardErrorText);
        }
        this.emit('exit');
    }
}
