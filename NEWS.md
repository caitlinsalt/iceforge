# Iceforge updates

## Release 1.0.3

Released 2024-06-21

- Issue 44 fixed.  In preview mode, an intermittent error was occurring when a client aborted a connection, as the server tried to handle the error by sending a 500 code to the client.  The server will now only try to send an error code if the headers have not been sent and the socket is still open.
