LogmeIn OAuth2.0 client sample web application
=======

This project contains a sample Node.js web service implementing the client backend for the OAuth2.0 implicit grant model.

The server exposes two endpoints:

* `callback`: Serves the a callback JavaScript script that parses the provided fragment in the client side and posts it back to the server `catchtoken` endpoint as a query string.
* `catchtoken`: Retrieves the `access_token` from the provided query string and perfoms its validation against the LogmeIn OAuth2 authorization server by using the [logmein-client-validation](https://github.com/activems/logmein-client-validation) NodeJS module.

In order to run this make sure you have `npm` and `node` installed and run"

```bash
$ npm install
$ node app.js
```

The web application start listening at `localhost:8000`.

> Note that your application does not need to be visible to the authorization server as the browser redirection to the callback takes place in the browser.

