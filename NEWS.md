# Iceforge updates

## Release 1.0.5

Release 2024-06-25

- [Issue 46](https://github.com/caitlinsalt/iceforge/issues/46) fixed.  In Page.filename(), the wrong value was being substituted for the `:day` placeholder in filename templates.

## Release 1.0.3

Released 2024-06-21

- [Issue 44](https://github.com/caitlinsalt/iceforge/issues/44) fixed.  In preview mode, an intermittent error was occurring when a client aborted a connection, as the server tried to handle the error by sending a 500 code to the client.  The server will now only try to send an error code if the headers have not been sent and the socket is still open.
