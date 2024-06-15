---
title: README
author: caitlin
date: 2024-06-01
categories: [ About Iceforge ]
template: article.pug
---

Welcome to your new blog! 

This is the default blog template: it includes pagination, category pages, monthly archive pages, and an RSS feed. Out of the box there is another template, `basic`, available, and you can install more locally -- run `iceforge new --help` to list the templates that your Iceforge installation can see.

## Blog template directory structure

The directory structure of this template is as follows:

```
├── config.json               <- site configuration
├── contents
│   ├── about.md
│   ├── archive.json
│   ├── articles              <– each article has its own directory
│   │   ├── another-test
│   │   │   └── index.md
│   │   ├── bamboo-cutter
│   │   │   ├── index.md
│   │   │   └── taketori_monogatari.jpg
│   │   ├── hello-world      <- The content of this article
│   │   │   └── index.md      
│   │   ├── markdown-syntax
│   │   │   └── index.md
│   │   └── red-herring
│   │       ├── banana.png
│   │       └── index.md
│   ├── authors               <- author metadata, rendered using author.pug
│   │   ├── baker.json
│   │   └── the-wintersmith.json
│   ├── css
│   │   └── main.css
│   └── feed.json
├── plugins
|   ├── archiver.js           <- generates monthly archive pages
|   ├── categoriser.js        <- generates categorised pages
│   └── paginator.js          <- generates the main blog feed
└── templates
    ├── archive.pug
    ├── article.pug
    ├── author.pug
    ├── feed.pug
    ├── index.pug
    └── layout.pug
```

Articles are displayed sorted by date with the newest at the top. 3 are shown per page, but you can configure this and change lots of other options in config.json.  The three supplied plugins all have fairly similar options, which are documented in their code files.  Markdown articles are rendered using the build-in Markdown plugin, which uses [marked.js](https://marked.js.org/).

### A typical article

```markdown
---
title: Hear me blog
author: johndoe
date: 2024-05-30 14:12
template: article.pug
---

This will be shown as the article excerpt if your template supports that.

## A h2, hr or <span class="more"> marks where the intro cuts off

Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo
consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse
cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

```

## Links in the markdown to other items in the content tree will be rewritten

For example a link to `../markdown-syntax/index.md` resolves to [`/articles/markdown-syntax/`](../markdown-syntax/index.md).

---

## Configuration

By default, configuration is stored in the file `config.json`.  A typical configuration file looks like this:

```json
{
  "baseUrl": "/",
  "locals": {
    "url": "http://localhost:8080",
    "name": "Blogging With Iceforge",
    "owner": "An Iceforge user",
    "description": "My latest thoughts and ideas"
  },
  "plugins": [
    "./plugins/complex-requires.js",
    "./plugins/paginator.js",
    "./plugins/archiver.js"
  ],
  "require": {
    "luxon": "luxon",
    "_": "underscore"
  },
  "pug": {
    "pretty": true
  },
  "markdown": {
    "smartLists": true
  },
  "paginator": {
    "perPage": 3
  },
  "restartOnConfigChange": true
}
```

The `baseUrl` option is a prefix path to appear at the start of URL paths.  If your site is going to be hosted in the root of a domain, leave this set to `/`.  If not, set the folder path here.

The `locals` values are passed through to the Iceforge plugins and templates at build time.  For example, in this template the `name` value is used for the title of the homepage.

The `plugins` elements are Iceforge plugin modules to be imported, in order.  The import order is significant if more than one plugin registers itself to handle the same filetype: the 
latest registration wins.

The `require` elements are other modules to be imported.  For each element of the form `"X": "y"`, module `y` will be imported and its default import will be accessible within your Pug templates under then name `X`, as if you had put `import X from 'y'` at the top of a JavaScript file.  For more complex import requirements, you can write a plugin which carries out the imports you need and makes them available within the environment as part of its registration function.

By convention, other objects within the config refer to plugins; the `markdown` object gets passed to marked.js, for example.  All of the out-of-the-box plugins supplied with Iceforge follow this convention.

---

This template gives you lots of features and hopefully will be a springboard for you to create your own&mdash;it's a simplified version of the template I use for my own blog.  You can use it as-is, or customise it as you see fit.  