import TemplatePlugin from '../../../core/templatePlugin';

import FakeTemplate from './fakeTemplate';

export default class BrokenFakeTemplate extends FakeTemplate {
    static async fromFile(): Promise<TemplatePlugin> {
        throw new Error('Load failed');
    }
}