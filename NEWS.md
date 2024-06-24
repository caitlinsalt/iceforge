# Iceforge updates

## Release 1.0.4

- There is a minor change to the behaviour of `Environment.reset()`.  In previous versions (and possibly also in Wintersmith), if the config file's `locals` key was the name of a JSON file, calling `Environment.reset()` would reset `Environment.locals` to the content of that file (at reset time) before reloading imported modules.  However, if the config file's `locals` key was an object, changes to `Environment.locals` would persist across calls to `Environment.reset()`.  From version 1.0.4 onwards, `Environment.reset()` resets `Environment.locals` to its initial state, whether that is a loaded JSON file or am object in the config file.

## Release 1.0.3

Released 2024-06-21

- Issue 44 fixed.  In preview mode, an intermittent error was occurring when a client aborted a connection, as the server tried to handle the error by sending a 500 code to the client.  The server will now only try to send an error code if the headers have not been sent and the socket is still open.
