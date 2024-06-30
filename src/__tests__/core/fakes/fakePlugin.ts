import ContentPlugin from '../../../core/contentPlugin';
import { ViewFunc } from '../../../core/coreTypes';

export class FakePlugin extends ContentPlugin {
    
    originalFilename: string;

    __view: string | ViewFunc;
    
    constructor(filename: string, view?: string | ViewFunc) {
        super();
        this.originalFilename = filename;
        this.__view = view ?? 'FakeView';
    }

    get name() {
        return 'FakePlugin';
    }

    get view() {
        return this.__view;
    }

    get filename() {
        return this.originalFilename;
    }

    get url() {
        return this.getUrl('/');
    }
}

const registrationFunction = async () => true;

export default registrationFunction;
