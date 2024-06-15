import pug from 'pug';
import fs from 'node:fs/promises';

import TemplatePlugin from '../core/templatePlugin.js';
import { FilePath, IEnvironment, LocalMap } from '../core/coreTypes.js';

let environment: IEnvironment;

// Concrete template plugin for rendering templates written in Pug - see https://pugjs.com
// Pug works by compiling the human-written template to a Javascript function, which can then
// be called with a context object to supply data to insert into the template.
//
// This plugin compiles the Pug code on template load, and its render function is a wrapper around
// the compiled template, meaning compilation only happens once=per=template during build, or when the preview
// server is started.
export class PugTemplate extends TemplatePlugin {
    
    get name() {
        return 'pug';
    }

    template: pug.compileTemplate;
    
    constructor(template: pug.compileTemplate) {
        super();
        this.template = template;
    }

    async render(locals: LocalMap): Promise<Buffer> {
        return Buffer.from(this.template(locals));
    }

    // Read the template file, compile it, and create a new plugin instance that uses
    // the compiled template function for rendering.
    static async fromFile(filepath: FilePath) {
        const buffer = await fs.readFile(filepath.full);
        const config = environment.config.pug || {};
        config.filename = filepath.full;
        const templateFn = pug.compile(buffer.toString(), config);
        return new PugTemplate(templateFn);
    }
}

// The Pug template module only registers the Pug template plugin.

const registerPlugin = async (env: IEnvironment) => {
    environment = env;
    env.registerTemplatePlugin('**/*.*(pug|jade)', PugTemplate);
};

export default registerPlugin;
