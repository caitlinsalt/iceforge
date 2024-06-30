import { FilePath } from '../../../core/coreTypes';
import TemplatePlugin from '../../../core/templatePlugin';

import FakeTemplate from './fakeTemplate';

export default class SpecialFakeTemplate extends FakeTemplate {
    get name() {
        return 'SpecialFakeTemplate';
    }

    static async fromFile(filepath: FilePath): Promise<TemplatePlugin> {
        const ft = new SpecialFakeTemplate();
        ft.__filepath = filepath;
        return ft;
    }
}
