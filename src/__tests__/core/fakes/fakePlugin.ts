import ContentPlugin from '../../../core/contentPlugin';
import { FilePath, IContentTree, IEnvironment, ViewFunc } from '../../../core/coreTypes';

export class FakePlugin extends ContentPlugin {
    
    __view: string | ViewFunc;

    __urlOverride: string;
    
    constructor(filename: string, view?: string | ViewFunc, parent?: IContentTree, urlOverride = '') {
        super();
        this.__urlOverride = urlOverride;
        this.__filename = filename;
        this.__view = view ?? 'FakeView';
        this.__plugin = {
            name: 'FakePlugin',
            group: 'fakes',
            pattern: '*',
            class: FakePlugin
        };
        if (parent) {
            this.parent = parent;
        }
    }

    get name() {
        return 'FakePlugin';
    }

    get view() {
        return this.__view;
    }

    get filename() {
        return this.__filename;
    }

    get url() {
        if (this.__urlOverride) {
            return this.__urlOverride;
        }
        return this.getUrl('/');
    }

    static async fromFile(fp: FilePath) {
        return new FakePlugin(fp.full);
    }
}

const registrationFunction = async (env: IEnvironment): Promise<void> => {
    env.registerContentPlugin('fakePages', '**/*.fake', FakePlugin);
};

export default registrationFunction;
