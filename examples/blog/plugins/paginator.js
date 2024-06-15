// A generator plugin for producing the home page of blog-type sites.  It takes all of the "articles" on the site - by default,
// pages inside the "articles" folder - and creates a set of pages, each containing content from potentially multiple
// articles, ordered in reverse date order.

// The registration function defines a new content plugin type, but does not register it. It registers a generator function,
// which will produce instances of the new content plugin type when called.
const registerPlugin = async (env /*: IEnvironment */) => {

    // Default plugin settings.  All of these can be overridden by putting a
    // "paginator": { ... } object in your config file.
    // 
    //  In the "filename" setting, %d is replaced by the page number.
    const defaults = {
        template: 'index.pug',              // The default template for the pages this plugin produces.
        articles: 'articles',               // The content folder to scan for articles.
        first: 'index.html',                // The filename of the first page output by the paginator.
        filename: 'page/%d/index.html',     // The filename pattern for subsequent pages output by the paginator.
        perPage: 2                          // The number of posts to put on each page.
    };

    // Load the options from the "paginator" section of the config file, if it is present.  Set
    // any missing options to the default value.
    const options = env.config.paginator || {};
    for (const k of Object.keys(defaults)) {
        options[k] = options[k] || defaults[k];
    }

    // Returns a flattened list of all of the articles in the articles folder of the content tree,
    // sorted in reverse date order.
    const getArticles = (contents /*: IContentTree */) => {
        const articles = contents[options.articles]._.directories
            .map((item) => item.index)
            .filter((item) => item.template !== 'none');
        articles.sort((a, b) => b.date - a.date);
        return articles;
    };

    // The content plugin class used for paginator pages.  Very similar to the Page plugin,
    // but adds metadata enabling the creation of links between successive pages.  The metadata it adds is:
    // - articles       The articles which should appear on this page.
    // - pageNum        The page number.
    // - prevPage       Reference to the previous page in the set.
    // - nextPage       Reference to the next page in the set.
    // - page           The plugin instance itself.
    class PaginatorPage extends env.plugins.Page {

        constructor(pagenum, articles) {
            super();
            this.pageNum = pagenum;
            this.articles = articles;
        }

        get name() {
            return 'paginator';
        }

        get filename() {
            if (this.pageNum === 1) {
                return options.first;
            } else {
                return options.filename.replace('%d', this.pageNum);
            }
        }

        get view() {
            return async (env, locals, contents, templates) => {
                const template = templates[options.template];
                if (!template) {
                    throw new Error(`Unknown paginator template ${options.template}`);
                }

                const context = {
                    articles: this.articles,
                    pageNum: this.pageNum,
                    prevPage: this.prevPage,
                    nextPage: this.nextPage,
                    page: this,
                    ...locals
                };

                return await template.render(context);
            };
        }
    }

    // The generator function.  Takes the articles, chunks them into blocks sized according to the perPage option,
    // and creates a PaginatorPage instance for each block of articles.  Each instance is then crosslinked with the
    // previous and next pages.
    env.registerGenerator('PaginatorPage', 'paginator', async (contents) => {
        const articles = getArticles(contents);
        const numPages = Math.ceil(articles.length / options.perPage);
        const pages = [];
        for (let i = 0; i < numPages; ++i) {
            const pageArticles = articles.slice(i * options.perPage, (i + 1) * options.perPage);
            pages.push(new PaginatorPage(i + 1, pageArticles));
        }

        for (let i = 0; i < pages.length; ++i) {
            if (i > 0) {
                pages[i].prevPage = pages[i - 1];
            }
            if (i < pages.length - 1) {
                pages[i].nextPage = pages[i + 1];
            }
        }

        const returnVal = { pages: {} };
        for (const page of pages) {
            returnVal.pages[`${page.pageNum}.page`] = page;
        }
        returnVal['index.page'] = pages[0];
        returnVal['last.page'] = pages[pages.length - 1];

        return returnVal;
    });

    
    env.helpers.getArticles = getArticles;
};

export default registerPlugin;
