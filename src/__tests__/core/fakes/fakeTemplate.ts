import TemplatePlugin from '../../../core/templatePlugin';

export default class FakeTemplate extends TemplatePlugin {
    get name() {
        return 'FakeTemplate';
    }
}