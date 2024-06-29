import * as path from 'node:path';

import { FilePath, IEnvironment, TemplateMap } from './coreTypes.js';
import { readDirRecursive } from './utils.js';
import { minimatch } from 'minimatch';
import logger from './logger.js';

// Load the available templates from the environment's template path, creating a template plugin instance for
// each template.  Returns the template plugin instances indexed by the templates' filenames.
const loadTemplates = async (env: IEnvironment): Promise<TemplateMap> => {
    
    const templates: TemplateMap = {}; 

    // Convert an array of filenames to an array of FilePaths.
    const resolveFilenames = (filenames: string[]): FilePath[] =>
        filenames.map(f => ({
            full: path.join(env.templatesPath, f),
            relative: f
        }));
    
    // Load an individual template and convert it into a template plugin instance.
    const loadTemplate = async (filepath: FilePath): Promise<void> => {
        logger.verbose(`Loading template ${filepath.relative}`);
        const plugin = [...env.templatePlugins].reverse().find(pdef => minimatch(filepath.relative, pdef.pattern));
        if (plugin) {
            try {
                const template = await plugin.class.fromFile(filepath);
                templates[filepath.relative] = template;
            } catch (error) {
                error.message = `template ${filepath.relative}: ${error.message}`;
                throw error;
            }
        }
    };

    const templateFiles = await readDirRecursive(env.templatesPath);
    const resolvedPaths = resolveFilenames(templateFiles);
    for (const resolvedPath of resolvedPaths) {
        await loadTemplate(resolvedPath);
    }

    return templates;
};

export default loadTemplates;
