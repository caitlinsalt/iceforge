import ContentPlugin from '../../../core/contentPlugin';

export class FakePlugin extends ContentPlugin {
    
    originalFilename: string;
    
    constructor(filename: string) {
        super();
        this.originalFilename = filename;
    }

    get name() {
        return 'FakePlugin';
    }

    get view() {
        return 'FakeView';
    }

    get filename() {
        return this.originalFilename;
    }

    get url() {
        return this.getUrl('/');
    }
}