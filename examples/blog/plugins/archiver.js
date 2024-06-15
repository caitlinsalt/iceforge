// A generator plugin that takes all the articles in a site and generates pages
// for each calendar month, together with a content plugin derived from the default
// Page plugin that gives each page the correct metadata etc.  The generator function
// also populates env.locals.monthData, which is an array of objects each containing the
// URL of the first page, human-readable name, and total article count of each month's set of pages.

const registerPlugin = async (env) => {

    // This string is used to pass months around within the code.  You probably don't want to change it, because
    // some parts of the code rely on characters 0-3 being the year and 5-6 being the month.
    const monthFormat = 'yyyy/MM';

    // Default plugin settings.  All of these can be overridden by putting an 
    // archiver: { ... } object in your site config file.
    //
    // In the URL config items:
    // - %y expands to the 4-digit year.
    // - %m expands to the padded 2-digit month.
    // - %d expands to the page number within the set of pages for the given month.
    // In the subheaderPattern config item, %D expands to the month, formatted using the 
    // subheaderDatePattern config item (which is a Luxon format string).
    const defaults = {
        template: 'index.pug',                          // Page template.
        articles: 'articles',                           // Location of the articles in the content tree.
        first: '%y/%m/index.html',                      // URL path of the first page for a given month.
        filename: '%y/%m/page/%d/index.html',           // URL path of the second and subsequent pages for a given month.
        subheaderPattern: 'Archive for %D',             // Text used for the page subheader.
        subheaderDatePattern: 'MMMM, yyyy',             // Format of date strings which can be inserted into the page subheader.
        undatedSubheaderPattern: 'Undated posts',       // Text used for the page subheader for the January 1970 page, whose contents are assumed to actually be undated.
        perPage: 2                                      // Maximum number of posts per page.
    };

    const options = env.config.archiver || {};
    for (const k in defaults) {
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

    // Returns a list of all the months containing articles.
    const getDistinctMonths = (articles) => {
        const allMonths = articles.map(a => env.locals.luxon.DateTime.fromJSDate(a.date).toFormat(monthFormat));
        return Array.from(new Set(allMonths));
    };

    // Returns all the articles which are dated to a particular month.
    const getArticlesInMonth = (articles, month) => {
        return articles.filter(a =>
            env.locals.luxon.DateTime.fromJSDate(a.date).toFormat(monthFormat) === month
        );
    };

    // A ContentPlugin class for pages created by this generator.  Adds the following metadata to the template context:
    // - articles       All of the articles on this page.
    // - month          The month and year of the page, as a "year/month" string.
    // - pageNum        The page number within the month.
    // - prevPage       Reference to the previous page in the month.
    // - nextPage       Reference to the next page in the month.
    // - subheader      Generated from the subheaderPattern and subheaderDatePattern, or undatedSubheaderPattern options.
    // - pageTitle      The site name.
    class MonthlyArchiverPage extends env.plugins.Page {

        constructor(month, pageNum, articles) {
            super();
            this.month = month;
            this.pageNum = pageNum;
            this.articles = articles;
            this.__env = env;
        }

        get filename() {
            const year = this.month.slice(0, 4);
            const month = this.month.slice(5);
            let fn = options.first;
            if (this.pageNum !== 1) {
                fn = options.filename.replace('%d', this.pageNum);
            }
            return fn.replace('%y', year).replace('%m', month);
        }

        get view() {
            return async (env, locals, contents, templates) => {
                const template = templates[options.template];
                if (!template) {
                    throw new Error(`Unknown archiver template ${options.template}`);
                }

                const pageDate = env.locals.luxon.DateTime.fromObject({ month: this.month.slice(5), year: this.month.slice(0, 4) });
                let subheadPattern = options.subheaderPattern;
                if (this.month === '1970/01') {
                    subheadPattern = options.undatedSubheaderPattern;
                }

                const context = {
                    articles: this.articles,
                    month: this.month,
                    pageNum: this.pageNum,
                    prevPage: this.prevPage,
                    nextPage: this.nextPage,
                    subheader: subheadPattern.replace('%D', pageDate.toFormat(options.subheaderDatePattern)),
                    pageTitle: env.locals.name,
                    ...locals
                };

                return await template.render(context);
            };
        }
    }

    // The generator function itself.
    await env.registerGenerator('archiver', async (contents) => {
        const articles = getArticles(contents);
        const months = getDistinctMonths(articles);
        let rv = { pages: {} };

        const createPages = (allArticles, month) => {
            const monthArticles = getArticlesInMonth(allArticles, month);
            const numPages = Math.ceil(monthArticles.length / options.perPage);
            const pages = [];
            for (let i = 0; i < numPages; ++i) {
                const pageArticles = monthArticles.slice(i * options.perPage, (i + 1) * options.perPage);
                pages.push(new MonthlyArchiverPage(month, i + 1, pageArticles));
            }

            for (let i = 0; i < pages.length; ++i) {
                if (i > 0) {
                    pages[i].prevPage = pages[i - 1];
                }
                if (i < pages.length - 1) {
                    pages[i].nextPage = pages[i + 1];
                }
            }

            return pages;
        };

        const populatePages = (pages, month) => {
            const slug = month.replace('/', '.');
            const output = { pages: {} };
            for (const page of pages) {
                output.pages[`month.${slug}.${page.pageNum}.page`] = page;
            }
    
            return output;
        };

        env.locals.monthData = [];
        for (const month of months) {
            const pages = createPages(articles, month);
            rv.pages = { ...rv.pages, ...(populatePages(pages, month)).pages };
            env.locals.monthData.push({
                url: pages[0].url,
                name: env.locals.luxon.DateTime.fromObject({month: pages[0].month.slice(5), year: pages[0].month.slice(0, 4)}).toFormat('MMMM yyyy'),
                count: pages.reduce((x, p) => x += p.articles.length, 0)
            });
        }

        return rv;
    });
};

export default registerPlugin;
