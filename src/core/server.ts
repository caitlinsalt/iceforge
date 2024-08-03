import { ReadStream } from 'node:fs';
import { createServer, ServerResponse, IncomingMessage, Server } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import chalk from 'chalk';
import chokidar, { FSWatcher } from 'chokidar';
import mime from 'mime';
import { minimatch } from 'minimatch';
import enableDestroy from 'server-destroy';

import Config from './config.js';
import ContentTree from './contentTree.js';
import { ContentMap, IContentTree, IConfig, TemplateMap, LocalMap } from './coreTypes.js';
import Environment from './environment.js';
import runGenerator from './generator.js';
import { renderView } from './render.js';
import logger from './logger.js';

const message404 = Buffer.from('404 Not Found In Aberhwmbr\n');

// Utility function to map HTTP return codes to colours.
const colourCode = (code: number): string => {
    switch (Math.floor(code / 100)) {
    case 2:
        return chalk.green(code);
    case 4:
        return chalk.yellow(code);
    case 5:
        return chalk.red(code);
    default:
        return code.toString();
    }
};

// Utility function to append 'index.html' to paths which end in a directory name.
const normaliseUrl = (url: string): string => {
    if (url.slice(-1) === '/') {
        url += 'index.html';
    } else if (url.match(/^([^.]*[^/])$/)) {
        url += '/index.html';
    }
    return decodeURI(url);
};

// Walk the content tree and build an index of all content, indexed by URL.
const buildLookupMap = (contents: IContentTree | IContentTree[]): ContentMap => {
    const map: ContentMap = {};
    for (const item of ContentTree.flatten(contents)) {
        map[normaliseUrl(item.url)] = item;
    }
    return map;
};

// Check if a mime type has an associated charset that we know about.
const lookupCharset = (mimeType: string): string => 
    /^text\/|^application\/(javascript|json)/.test(mimeType) ? 'UTF_8' : null;

// Utility function to use when polling.
const sleep = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

type RequestHandlerFunc = {
    (request: IncomingMessage, response: ServerResponse): Promise<void>;
    destroy: () => void;
}

// Create the server for an environment, by loading the environment in much the same way as the build command.
// Also sets up change handlers to try to reload parts of the environment if changes are detected.
const setup = async (env: Environment): Promise<RequestHandlerFunc> => {
    let contents: IContentTree = null;
    let generatedContentTree: IContentTree = null;
    let lastGenerationTime: number = null;
    let generatedContentMap: ContentMap = {};
    const generationTimeout = env.config.minRegenerationDelay * 1000;
    let templates: TemplateMap = null;
    let locals: LocalMap = null;
    let staticContentMap: ContentMap = {};

    type blockRecord = {
        contentsLoad: boolean;
        templatesLoad: boolean;
        viewsLoad: boolean;
        localsLoad: boolean;
    }

    const block: blockRecord = {
        contentsLoad: false,
        templatesLoad: false,
        viewsLoad: false,
        localsLoad: false,
    };

    const isReady = () => !(block.contentsLoad || block.templatesLoad || block.viewsLoad || block.localsLoad);
    
    const logError = (error?: Error): void => {
        if (error) {
            env.logger.error(error);
        }
    };

    const changeHandler = (error: Error, path: string): void => {
        if (!error) {
            env.emit('change', path, false);
        }
        logError(error);
    };

    const loadContents = async (): Promise<boolean> => {
        block.contentsLoad = true;
        staticContentMap = {};
        generatedContentMap = {};
        generatedContentTree = null;
        contents = null;
        let rval = true;
        try {
            contents = await ContentTree.fromDirectory(env, env.contentsPath);
            staticContentMap = buildLookupMap(contents);
        } catch (error) {
            logError(error);
            rval = false;
        }
        block.contentsLoad = false;
        return rval;
    };

    const loadTemplates = async (): Promise<void> => {
        block.templatesLoad = true;
        templates = null;
        try {
            templates = await env.getTemplates();
        } catch (error) {
            logError(error);
        }
        block.templatesLoad = false;
    };

    const loadViews = async(): Promise<void> => {
        block.viewsLoad = true;
        try {
            await env.loadViews();
        } catch (error) {
            logError(error);
        }
        block.viewsLoad = false;
    };

    const loadLocals = async (): Promise<void> => {
        block.localsLoad = true;
        locals = await env.getLocals();
        block.localsLoad = false;
    };

    const contentWatcher = chokidar.watch(env.contentsPath, { ignoreInitial: true });
    contentWatcher.on('all', async (type, filename) => {
        if (block.contentsLoad) {
            return;
        }
        const relPath = env.relativeContentsPath(filename);
        for (const pattern of env.config.ignore) {
            if (minimatch(relPath, pattern)) {
                env.emit('change', relPath, true);
                return;
            }
        }
        let contentFilename = null;
        if (await loadContents()) {
            if (filename) {
                for (const content of ContentTree.flatten(contents)) {
                    if (content.__filename === filename) {
                        contentFilename = content.filename;
                        break;
                    }
                }
            }
        }
        changeHandler(null, contentFilename);
    });

    const templateWatcher = chokidar.watch(env.templatesPath, { ignoreInitial: true});
    templateWatcher.on('all', async () => {
        if (!block.templatesLoad) {
            await loadTemplates();
        }
    });

    let viewsWatcher: FSWatcher = null;
    if (env.config.views) {
        viewsWatcher = chokidar.watch(env.config.views, { ignoreInitial: true });
        viewsWatcher.on('all', async () => {
            if (!block.viewsLoad) {
                await loadViews();
            }
        });
    }

    type ContentHandlerResult = {
        error?: Error;
        code: number;
        pluginName: string;
    }

    // Create a 404 result.
    const return404 = (response: ServerResponse, pluginName: string): ContentHandlerResult => {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('404 Not Found In Aberhwmbr\n');
        return { error: null, code: 404, pluginName };
    };

    // Called by requestHandler().  Take incoming HTTP requests, rerun all generators, try to match the request to an item in the content tree,
    // and if there is a match, render that item and return the output.
    const contentHandler = async (request: IncomingMessage, response: ServerResponse): Promise<ContentHandlerResult> => {
        const uri = normaliseUrl(new URL(request.url, `http://${request.headers.host}`).pathname);
        env.logger.verbose(`contentHandler - ${uri}`);

        // Rerun generators if needed.
        if ((!generatedContentTree) || (lastGenerationTime + generationTimeout < Date.now())) {
            const generated = await Promise.all(env.generators.map(async (g) => runGenerator(env, contents, g)));
            generatedContentTree = contents;
            
            if (generated.length > 0) {
                generatedContentTree = new ContentTree('', env.getContentGroups());
                for (const gentree of generated) {
                    ContentTree.merge(generatedContentTree, gentree);
                }
                generatedContentMap = buildLookupMap(generated);
                ContentTree.merge(generatedContentTree, contents);
            }

            lastGenerationTime = Date.now();
        }

        const content = generatedContentMap[uri] || staticContentMap[uri];
        if (content) {
            const pluginName = content.__plugin.name;
            try {
                const renderOutput = await renderView(env, content, locals, generatedContentTree, templates);
                let code = 200;
                if (renderOutput) {
                    if (!(renderOutput instanceof Buffer || renderOutput instanceof ReadStream)) {
                        throw new Error(`Something is wrong in Iceforge!  View for content ${content.filename} returned invalid response; Buffer or Stream expected.`);
                    }
                    const mimeType = mime.getType(content.filename) || mime.getType(uri);
                    const charset = lookupCharset(mimeType);
                    const contentType = charset ? `${mimeType}; charset=${charset}` : mimeType;
                    await writeOutput(response, code, contentType, renderOutput);
                    return { error: null, code, pluginName, };
                } else {
                    code = 404;
                    await writeOutput(response, code, 'text/plain', message404);
                    return { error: null, code, pluginName };
                }
            } catch (error) {
                logger.verbose(error.message);
                await writeOutput(response, 500, 'text/plain', error.message);
                return { error, code: 500, pluginName };
            }
        }
        return return404(response, 'Unknown ');
    };

    const writeOutput = async (response: ServerResponse, code: number, contentType: string, content: ReadStream | Buffer): Promise<void> => {
        let source;
        if (content instanceof Buffer) {
            source = Readable.from(content);
        } else {
            source = content;
        }

        if (!response.headersSent && response.socket) {
            response.writeHead(code, { 'Content-Type': contentType});
        }
        if (!response.writableEnded && response.socket) {
            await pipeline(source, response);
            response.end();
        }
    };

    // Handles incoming HTTP requests.  Checks that the environment is properly loaded; calls the content handler, and sends the appropriate 
    // response depending on the content handler result.
    const requestHandler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
        const startTimestamp = Date.now();
        const uri = new URL(request.url, `http://${request.headers.host}`).pathname;
        if (!block.contentsLoad && !contents) {
            await loadContents();
        }
        if (!block.templatesLoad && !templates) {
            await loadTemplates();
        }
        while (!isReady()) {
            await sleep();
        }
        const handlerFeedback = await contentHandler(request, response);
        let responseCode = 404;
        if (!handlerFeedback) {
            writeOutput(response, responseCode, 'text/plain', message404);
        } else {
            responseCode = handlerFeedback.code;
        }

        // Check the time taken and log it.
        const timeDelta = Date.now() - startTimestamp;
        let logMsg = `${colourCode(responseCode)} ${chalk.bold(uri)}`;
        if (handlerFeedback && handlerFeedback.pluginName) {
            logMsg += ` ${chalk.grey(handlerFeedback.pluginName)}`;
        }
        logMsg += ` ${chalk.green(timeDelta)}ms`;
        env.logger.info(logMsg);
        if (handlerFeedback && handlerFeedback.error) {
            env.logger.error(handlerFeedback.error.message, handlerFeedback.error);
        }
    };

    await loadContents();
    await loadTemplates();
    await loadViews();
    await loadLocals();

    requestHandler.destroy = () => {
        contentWatcher.close();
        templateWatcher.close();
        if (viewsWatcher) {
            viewsWatcher.close();
        }
    };

    return requestHandler;
};

// Runs a previously-set-up server.  If configured to, watches for change events on the config file and restarts the server
// when change is detected.
const run = async (env: Environment): Promise<Server> => {
    let server: Server = null;
    let handler: RequestHandlerFunc = null;

    if (env.config.restartOnConfigChange && env.config.filename) {
        env.logger.verbose(`Watching config file ${env.config.filename} for changes.`);
        const configWatcher = chokidar.watch(env.config.filename);
        configWatcher.on('change', async () => {
            let config: IConfig = null;
            try {
                config = await Config.fromFile(env.config.filename);
            } catch (error) {
                env.logger.error(`Error reloading config: ${error.message}`);
            }
            if (config) {
                if (env.config._cliopts) {
                    config._cliopts = {...env.config._cliopts};
                }
                env.setConfig(config);
            }
            await restart();
            env.logger.verbose('Config file change detected, server reloaded.');
            env.emit('change');
        });
    }

    const restart = async () => {
        env.logger.info('Restarting server');
        stopServer();
        await startServer();
    };

    const stopServer = () => {
        if (server) {
            server.destroy();
            handler.destroy();
            env.reset();
        }
    };

    const startServer = async (): Promise<Server> => {
        await env.loadPlugins();
        handler = await setup(env);
        const server = createServer(handler);
        enableDestroy(server);
        await new Promise((resolve) => server.listen(env.config.port, env.config.hostname, () => resolve(null)));
        return server;
    };

    process.on('uncaughtException', (error) => {
        env.logger.error(error.message, error);
        process.exit(1);
    });

    env.logger.verbose('Starting preview server');

    server = await startServer();
    const host = env.config.hostname || 'localhost';
    const serverUrl = `http://${host}:${env.config.port}${env.config.baseUrl}`;
    env.logger.info(`Server running on ${chalk.bold(serverUrl)}`);
    return server;
};

export { RequestHandlerFunc, setup, run };
