# Iceforge

A static site generator written for [Node.js]().  Out of the box, Iceforge can be used to combine an HTML website design templated using [Pug](), with content written in Github-flavoured Markdown, to produce static HTML content suitable for hosting on essentially any cloud-based or on-premises hosting service.  It's also straightforward to incorporate into a continuous integration and deployment pipeline, to publish changes directly from source control to your website.  It incorporates a preview server for rapid development of your site designs.

For more information, read the full documentation.

Iceforge is inspired by and derived from [Wintersmith](https://wintersmith.io) by Johan Nordberg, and the version 1 release is intended to be compatible with Wintersmith as far as is practicable.  For more information, read the History section below.

## Installation

Iceforge requires a working Node.js and NPM installation.

FIXME to complete.

## Usage (summary)

`$ iceforge new` will create a blank website based on one of the shipped site templates, or copied from a template you have created.

`$ iceforge preview` will run a minimal development server which renders the content of your Iceforge site on the fly, enabling you to develop and test your website designs and content without manually rerendering the site.  Using it as a production server is not recommended.

`$ iceforge build` will render your website to HTML files and other assets, ready for upload to your web host.

## Plugins

Iceforge uses a plugin-based architecture.  Each plugin module can contain a mixture of content plugins, template plugins, view plugins and page generation plugins.  Out of the box, Iceforge comes with plugins to handle Pug templates and Markdown content rendering, and additional plugins can be loaded by each site.  The supplied "blog" website template contains page generation plugins for aggregating content pages by date, author or article category, which you can use as a basis for building your own.  Any content files which Iceforge does not know how to handle will be written to the output unchanged.

For more information on building your own plugins, please refer to the full documentation.

## History

In 2020, I took my personal blog off hiatus and migrated it away from using self-hosted Wordpress to being a static site generated using Wintersmith.  However, it became clear that Wintersmith was no longer receiving updates, and was being left behind both by its dependencies, and by changes and developments in the wider JavaScript ecosystem.  Rather than migrate my own sites to a more complex SSG, I resolved to create a modern, updated Wintersmith.  Iceforge v1 is essentially Wintersmith, but completely rewritten line by line, with the following changes made:
- Iceforge is written in TypeScript, rather than CoffeeScript.
- Iceforge uses ES6 modules, rather than CommonJS modules.
- Iceforge uses ES2017 async/await patterns, rather than continuation callbacks.
- Various other modern JavaScript and TypeScript language constructs have been used, such as arrow functions.
- Various dependencies have been updated to use more modern equivalents (for example, moment.js has been replaced by Luxon).  Iceforge does not rely on any dependency features which have, at the time of release, been deprecated.
- The way in which Iceforge patches Marked.js to change its link-writing behaviour has had to be changed due to internal changes in Marked.js.

It should be relatively straightforward to convert a Wintersmith plugin to an Iceforge v1 plugin, as long as the plugin is converted to be a JavaScript ES6 module whose default export is its Iceforge registration function.  This should be an async function which takes the Iceforge environment object as its only parameter.  A handful of breaking API changes have been made:
- The `ContentPlugin` functions `getFilename()` and `getView()` have become getter functions called `filename()` and `view()`.  This is to replicate the behaviour of CoffeeScript.
- The `ContentPlugin` function `getUrl()` and the `Page` function `getHtml()` have had additional getter functions `url()` and `html()` added which call the original function with default parameters.  If you are subclassing either class and want to override these functions, you should still override the original `getUrl()` and/or `getHtml()` functions.  You are likely to want to leave the getter functions unchanged.  This is also to replicate the behaviour of CoffeeScript.

## Licensing

Iceforge is distributed under the MIT license.  See the file `LICENSE` for details.

Iceforge is derived from Wintersmith v2.5.0, which is also distributed under the MIT license.

## Credits

Iceforge was created by Caitlin Salt.

Iceforge is derived from Wintersmith v2.5.0, which was created by Johan Nordberg.
