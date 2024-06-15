import { FilePath, LocalMap } from './coreTypes.js';

export type TemplatePluginDef = {
    pattern: string;
    class: typeof TemplatePlugin;
}

// The base type of template plugins.  This class should be treated as abstract; concrete template plugins (like the default Pug plugin)
// should inherit this class and implement render() and fromFile().
export default class TemplatePlugin {

    get name() { 
        return 'TemplatePlugin'; 
    }

    // Constructor provided to ensure that inheritors can declare a different constructor signature without upsetting Typescript.
    // eslint-disable-next-line
    constructor(...args: any[]) {}
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async render(locals: LocalMap): Promise<Buffer> {
        throw new Error('Not implemented');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async fromFile(filepath: FilePath): Promise<TemplatePlugin> {
        throw new Error('Not implemented');
    }
}
