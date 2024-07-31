import { FilePath } from '../../../core/coreTypes';
import TemplatePlugin from '../../../core/templatePlugin';

export default class FakeTemplate extends TemplatePlugin {

    __filepath: FilePath;

    get name() {
        return 'FakeTemplate';
    }
    
    static async fromFile(filepath: FilePath): Promise<TemplatePlugin> {
        const ft = new FakeTemplate();
        ft.__filepath = filepath;
        return ft;
    }
}