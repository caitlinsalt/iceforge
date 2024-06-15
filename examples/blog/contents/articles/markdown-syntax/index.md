---
title: Markdown syntax
author: caitlin
date: 2024-04-17 19:34:00
categories: [ About Iceforge, These Posts Are In Multiple Categories ]
template: article.pug
---
By default, Iceforge comes with a Markdown-parsing plugin, which calls [marked.js](https://marked.js.org/) to carry out the actual rendering.

Here's some information on using Markdown.  If you've used Markdown before, you can skip to the technical bit at the end.

<span class="more">If you haven't...maybe you have anyway</span>.  Lots of apps and websites use Markdown for rendering user input, because it has the benefit that if you're writing plain text, it just looks like plain text.  If you leave a blank line between lines of text, Markdown will format the lines either side into paragraphs.  If you use \*asterisks\* or \_underscores\_ for emphasis, it will come out *like this*.  If you use \*\*two asterisks\*\*, you get **this**.  There's Markdown syntax for adding links, images, tables; and if it doesn't handle what you want, you can just write HTML and it will be passed through to the output.

I'm not going to go into detail about how to do all those things, but I'll put some links at the end to take you to various places with more information about the syntax.

In Iceforge, each Markdown page also includes a block of data, called "front matter", at the start.  This is in YAML format and is where you set things like the page title and the template to use for rendering.  The front matter block starts and ends with lines just containing `---`, which are also used in Markdown to give you a horizontal line.

### Links to further reading

The original Markdown specification is in [this 2004 post](https://daringfireball.net/projects/markdown/syntax) by its author John Gruber.  Unlike most specification documents, it is very readable.

If you prefer more formal specifications, you can read those for [CommonMark](https://spec.commonmark.org/0.31.2/) and [GitHub-Flavoured Markdown](https://github.github.com/gfm/).  GitHub also provides [more readable syntax documentation](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax), which also mentions a few things that you need to drop back into HTML for, such as <sup>superscript text</sup>.  However, it also mentions a few things that are GitHub features, not GFM features, and these aren't supported by Iceforge.

You can find tutorials and more information at the [Markdown Guide](https://www.markdownguide.org/)---bear in mind that this includes documentation of features that Iceforge does not support without adding further Marked extensions to your configuration.

For documentation on the punctuation rendering used by Iceforge, look up [Smartypants](https://github.com/othree/smartypants.js), which was also originally created by John Gruber.

### Technical details

The Markdown parser used is Marked, version 5, together with a few extensions for things like code highlighting and nice typography.

Marked supports "original Markdown", CommonMark, and GitHub-Flavoured Markdown (GFM).  GFM support can be disabled by changing `"gfm": true` to `"gfm": false` in the `markdown` section of the site configuration file.  If the line is removed altogether from the configuration, it defaults to `true`.

The Marked extensions used are: 
- `marked-gfm-heading-id`, which enables you to include a Table of Contents in your page.
- `marked-highlight`, which is used in combination with `highlight.js` to provide syntax highlighting of code blocks.  To make this visible you will need to load a CSS theme file---[see here for more details](/articles/code-syntax-highlighting/).
- `marked-mangle`, which tries to obfuscate email addresses in your output.
- `marked-smartypants`, which gives you nicer rendering of some punctuation---like this dash, for example.
