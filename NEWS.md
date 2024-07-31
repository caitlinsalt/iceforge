# Iceforge updates

## Release 1.0.6

Released 2024-07-31

- [Issue 48](https://github.com/caitlinsalt/iceforge/issues/48) fixed.  The --require command line option was not being processed.
- Previous versions of Iceforge did not include an --imports command line option to specify the contents of the configuration file imports block on the command line.  Instead, the --require option had to be used.  This version supports both --imports and --require.
- In previous versions of Iceforge, the function `ContentTree.merge()` crashed out if the second parameter was `null` or `undefined`.  Although Typescript would warn if this situation was coded directly, it was possible to encounter the bug when, for example, writing a JavaScript generator plugin that returned `null` to indicate an empty tree, which the definition of the `GeneratorDef` type implied was permitted.  Now, `ContentTree.merge()` will return without modifying the first parameter if the second parameter is a falsy value.
- The default view function for pages rendered with the shipped Page and MarkdownPage plugins is now exported from the Page plugin module under the name `templateView`, so that plugin implementers can easily access its behaviour if needed.
- There is a minor change to the behaviour of the CLI.  In previous versions, most invalid commands would give an `Invalid command` error and print the usage message, but the command `iceforge plugin` would instead generate a developer-readable NodeJS error.  This is because `plugin` was a legal command verb in Wintersmith.  Now, the command `iceforge plugin` will give the message `Invalid command` and print the usage message, as per any other invalid command.  It is intended to implement `iceforge plugin` at a later date when more Iceforge plugins have been published.
- There is a minor change to the behaviour of `Environment.reset()`.  In previous versions (and possibly also in Wintersmith), if the config file's `locals` key was the name of a JSON file, calling `Environment.reset()` would reset `Environment.locals` to the content of that file (at reset time) before reloading imported modules.  However, if the config file's `locals` key was an object, changes to `Environment.locals` would persist across calls to `Environment.reset()`.  From version 1.0.6 onwards, `Environment.reset()` resets `Environment.locals` to its initial state, whether that is a loaded JSON file or an object in the config file.
- There is a minor change to the behaviour of the `Page.filename` property, and the inherited behaviour of `MarkdownPage.filename` and `JsonPage.filename`.  In previous version (and possibly also in Wintersmith), this property would strip any leading directory separator character when running on Unix systems but not on Windows, because the code at that point was hardcoded to look for the `/` character.  This has been changed so that a leading directory separator character will be stripped from `Page.filename`, `MarkdownPage.filename` or `JsonPage.filename` on any platform.  This should have no practical effect in the great majority of cases.
- There is an insignificant change to the behaviour of concrete classes which inherit from `ContentPlugin`, such as `Page`, `MarkdownPage` and `JsonPage`.  The base implementation of `ContentPlugin.getUrl()` and `ContentPlugin.url`, in previous versions and in Wintersmith, did not work as expected on platforms that used `\` as the directory separator string but did not identify themselves as `win32`.  This change is currently academic, as at present there are no Node platforms this applies to.
- Minor-level dependency updates have been applied to Typescript (to v5.5.3) and highlight.js (to v11.10.0).
- Patch-level dependency updates have been applied to Minimatch (to v9.0.5), Winston (to v3.13.1) and `@types/node` (to v20.14.10).

## Release 1.0.5

Released 2024-06-25

- [Issue 46](https://github.com/caitlinsalt/iceforge/issues/46) fixed.  In Page.filename(), the wrong value was being substituted for the `:day` placeholder in filename templates.

## Release 1.0.3

Released 2024-06-21

- [Issue 44](https://github.com/caitlinsalt/iceforge/issues/44) fixed.  In preview mode, an intermittent error was occurring when a client aborted a connection, as the server tried to handle the error by sending a 500 code to the client.  The server will now only try to send an error code if the headers have not been sent and the socket is still open.
