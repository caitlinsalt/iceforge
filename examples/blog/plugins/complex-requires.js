// This is a very simple plugin.
//
// It demonstrates how to make an import available to your templates, when that import is not its module's default export.
// In the case of github-slugger, we're doing this to turn off slug deduplication, so we can slugify the same article category
// name multiple times and get a consistent slug back each time.
//
// This is primarily here as an example - a different workaround for this which wouldn't need this plugin would just be to 
// create a new slugger object every time we need one, which is the strategy the main Iceforge app takes.

import { slug } from 'github-slugger';

const registerPlugin = async (env) => {
    env.locals.slug = slug;
};

export default registerPlugin;
