import { vi } from 'vitest';
import { EventEmitter } from 'node:events';

export default class FakeWriteable extends EventEmitter {
    
    end: (data: Buffer) => void;

    constructor() {
        super();
        this.end = vi.fn(async () => {
            await this.sleep(0.05);
            this.emit('finish');
        });
    }

    sleep(secs: number) {
        return new Promise(r => setTimeout(r, secs * 1000));
    }
}

export class FakeFileHandle {
    createWriteStream() {
        const writeable = new FakeWriteable();
        fakeWriteables.push(writeable);
        return writeable;
    }
}

export const fakeWriteables: FakeWriteable[] = [];
