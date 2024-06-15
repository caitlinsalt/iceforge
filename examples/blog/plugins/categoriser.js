// A generator plugin that takes all of the articles in a site, looks at their 'categories' metadata field, and generates
// a set of pages for each distinct category found, together with a content plugin derived from the default Page plugin
// that adds the necessary metadata.   The generator function also populates env.locals.categoryData, an array which lists
// the names of the categories, the URL of the first page in each set, and the total number of articles in each set of pages.
//
// The plugin also generates a set of pages for articles with no category metadata.  By default this is called the 
// "Uncategorised" category.
//
// The "categories" metadata item should be either a string or an array of strings.
const registerPlugin = async (env) => {

    // Default plugin settings.  All of these can be overridden by putting a 
    // "categoriser": { ... } object in your config file.
    //
    // In the URL config items:
    // - %c expands to the slugified name of the category
    // - %d expands to the page number within that set.
    // In the subheaderPattern and pageTitlePattern config items:
    // - %C expands to the name of the category.
    const defaults = {
        template: 'index.pug',                              // Default template for the page.
        articles: 'articles',
        first: 'category/%c/index.html',                    // filename/url for first page of each category
        filename: 'category/%c/page/%d/index.html',         // filename for rest of the pages in each category
        subheaderPattern: 'Archive for the ‘%C’ category',  // pattern for subheader text
        pageTitlePattern: ' : %C',                          // pattern for page title
        uncategorisedCategory: 'Uncategorised',             // The name to use for the category of articles with no category.
        perPage: 2                                          // number of articles per page
    };

    const options = env.config.categoriser || {};
    for (const key in defaults) {
        options[key] = options[key] || defaults[key];
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

    // Returns articles that have non-empty category metadata.
    const getArticlesWithCategory = (articles) =>
        articles.filter(a => a.metadata.categories && ((!Array.isArray(a.metadata.categories)) || a.metadata.categories.length));

    // Returns articles that do not have category metadata.
    const getArticlesWithoutCategory = (articles) => 
        articles.filter(a => (!a.metadata.categories) || (Array.isArray(a.metadata.categories) && a.metadata.categories.length === 0));

    // Returns articles with a specific category.
    const getArticlesInCategory = (articles, category) => 
        articles.filter(a => a.metadata.categories === category || (Array.isArray(a.metadata.categories) && a.metadata.categories.includes(category)));

    // Returns an array of distinct category names.
    const getDistinctCategories = (articles) => {
        const flatten = articles.map(a => a.metadata.categories).reduce((a, v) => (a || []).concat(v), []);
        const uniques = Array.from(new Set(flatten));
        uniques.sort();
        return uniques;
    };

    // A ContentPlugin class for pages created by this generator.  Adds the following metadata to the template context:
    // - articles       All of the articles to be shown on this page.
    // - pageNum        The number of the page within its set.
    // - prevPage       The previous page in the set.
    // - nextPage       The next page in the set.
    // - subheader      The page subheader, derived from the subheaderPattern option
    // - pageTitle      The page title, derived from the site name and the pageTitlePattern option
    class CategoriserPage extends env.plugins.Page {
        
        constructor(category, pageNum, articles) {
            super();
            this.category = category;
            this.pageNum = pageNum;
            this.articles = articles;
            this.__env = env;
        }

        get filename() {
            const slug = env.locals.slug(this.category);
            if (this.pageNum === 1) {
                return options.first.replace('%c', slug);
            }
            return options.filename.replace('%d', this.pageNum).replace('%c', slug);
        }

        get view() {
            return async (env, locals, contents, templates) => {
                const template = templates[options.template];
                if (!template) {
                    throw new Error(`Unknown categoriser template ${options.template}`);
                }

                const context = {
                    articles: this.articles,
                    pageNum: this.pageNum,
                    prevPage: this.prevPage,
                    nextPage: this.nextPage,
                    subheader: options.subheaderPattern.replace('%d', this.pageNum).replace('%C', this.category),
                    pageTitle: env.locals.name + options.pageTitlePattern.replace('%C', this.category),
                    ...locals
                };

                return await template.render(context);
            };
        }
    }

    env.registerGenerator('categoriser', async (contents) => {
        const allArticles = getArticles(contents);
        const articles = getArticlesWithCategory(allArticles);
        const categories = getDistinctCategories(articles);
        let rv = { pages: {} };

        const createPages = (allArticles, category) => {
            let catArticles = [];
            if (category === options.uncategorisedCategory) {
                catArticles = getArticlesWithoutCategory(allArticles);
            } else {
                catArticles = getArticlesInCategory(allArticles, category);
            }
            const numPages = Math.ceil(catArticles.length / options.perPage);
            const pages = [];
            for (let i = 0; i < numPages; ++i) {
                const pageArticles = catArticles.slice(i * options.perPage, (i + 1) * options.perPage);
                pages.push(new CategoriserPage(category, i + 1, pageArticles));
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

        const populatePages = (pages, category) => {
            const output = { pages: {} };
            for (const page of pages) {
                output.pages[`${env.locals.slug(category)}.${page.pageNum}.page`] = page;
            }
    
            return output;
        };

        env.locals.categoryData = [];
        for (const cat of categories) {
            const pages = createPages(articles, cat);
            rv.pages = { ...rv.pages, ...(populatePages(pages, cat)).pages };
            env.locals.categoryData.push({
                name: cat,
                longer: `Posts categorised in ${cat}`,
                count: pages.reduce((x, p) => x += p.articles.length, 0)
            });
        }

        const uncategorisedArticles = getArticlesWithoutCategory(allArticles);
        if (uncategorisedArticles.length > 0) {
            const cat = options.uncategorisedCategory;
            const pages = createPages(uncategorisedArticles, cat);
            rv.pages = { ...rv.pages, ...(populatePages(pages, cat)).pages };
            env.locals.categoryData.push({
                name: cat,
                longer: `${cat} posts.`,
                count: pages.reduce((x, p) => x += p.articles.length, 0)
            });
        }

        return rv;
    });
};

export default registerPlugin;
