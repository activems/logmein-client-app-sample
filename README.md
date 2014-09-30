LogmeIn OAuth2.0 client sample web application
=======

This project provides a sample Node.js web application that illustrates how to integrate LogmeIn multi-factor authentication on your website.

Running this code
-------
Before you start checking out any code, you can also try a live version of this project [here](https://bloggar.actisec.com).

In order to run this make sure you have `node` as well as `npm` and `bower` installed and execute:

```bash
$ npm install && bower install
```
Before starting running the application, make sure you modify the application's `client_id` in the `index.html` file. You may use one you already have, or obtain a new one from [our website]().

Once you've done that you may execute:

```bash
$ node app.js
```

The web application will start listening at `localhost:8000`.

> Note that your application does not need to be visible to the outside world, so no further setup is needed.

How does all this work?
--------

Easy. 

The LogmeIn multi-factor authentication for client-side applications uses the *OAuth2 implicit grant model* from [RFC 6749](http://tools.ietf.org/html/rfc6749#section-4.2).

One important characteristic of these applications is that the cannot keep a secret, which means that the client secret cannot be used to stablish the authentication.

In order to cirnunvent this issue, the implicit grant model involves that the client should provide a callback endpoint on their web infrastructure.

Here's an illustration of how the whole authorization process
works using the implicit grant model:

```
+----------+
| Resource |
|  Owner   |
|          | 
+----------+
     ^
     |
    (B)
+----|-----+          Client Identifier     +---------------+
|         -+----(A)-- & Redirection URI --->|               |
|  User-   |                                | Authorization |
|  Agent  -|----(B)-- User authenticates -->|     Server    |
|          |                                |               |
|          |<---(C)--- Redirection URI ----<|               |
|          |          with Access Token     +---------------+
|          |            in Fragment
|          |                                +---------------+
|          |----(D)--- Redirection URI ---->|   Web-Hosted  |
|          |          without Fragment      |     Client    |
|          |                                |    Resource   |
|     (F)  |<---(E)------- Script ---------<|               |
|          |                                +---------------+
+-|--------+
  |    |
 (A)  (G) Access Token
  |    |
  ^    v
+---------+
|         |
|  Client |
|         |
+---------+
```

From the web application's perspective this means that:

* Your login page, or whatever other sign in means you may want to provide for your users needs to start the authentication.
* Your web server should expose two endpoints:
    * A callback that will be invoked by the LogmeIn authentication server, passing the `access_token` and executed on the user agent (browser).
    * Some means for the callback to contact back your server and send the `access_token`.

> An `access_token` is a unique id issued by the authorization server that provides you access to the user's data and it should be always kept secret. 

* Your web server should perform all this communication through `https`.
    
You may choose to use the [LogmeIn RESTful API](), but in order to make it easier this sample makes use of two components that you may include in your projects:

* [logmein-webclient](https://github.com/activems/logmein-webclient): A JavaScript library that enables your client-side code to interface the authentication server. 

* [logmein-webclient-be](https://github.com/activems/logmein-webclient-be): A Node.js module that enables your web application to validate the `access_token` and retrieve resources from the .

> *NOTE*: You will find some shared functionality between these components but the authentication request can only be triggered by the client.

Implementation details
-------

The web application entry point is `index.html`. The important bits here are:

* Import `logmein-webclient`:

```html
<script src="libs/logmein-webclient/lib/main.js"></script>
```

* Implement a JavaScript function to trigger the authentication request:

```html
<script type="text/javascript">
var init = function() 
{
    // Instantiate the authentication client
    var client = new LogmeinWeblient();

    var loc = window.location;

    // Trigger the redirection to the authentication server
    client.authenticate(
    {
        client_id:    "vr7N83Ekmti22JmAfOfkkSbntOORdWaZtB3hjyU2",
        redirect_uri: loc.protocol + '//' + loc.host + "/callback",
        scope:        "profile",
        state:        "welcome"
    });
}
</script>
```

 * Here the `client_id` should be a valid one.
 * The `redirect_uri` points to the callback on the server which will be explained later.
 *`scope` defines what data from the user your application is requesting. In this case, the access will be granted to the `profile` realm which provides access to the user identification data.
 *`state` is used in this sample to let the callback know where to point the browser if the user grants access. In this case this points to the `welcome` endpoint but it's up to your implementation how to use it.

* In this sample, the authentication request is triggered by a HTML `button` component `onclick` event:

```html
<button onclick="init()"> ... Use LogmeIn to sign in</button>
```
When the button gets clicked the browser will be redirected to the authentication server so that the user can perform the authentication. 

The result of the user authentication will be sent back to the web app by invoking the callback provided in the `redirect_uri`, which is `/callback` in this case, passing the data in the URI fragment data.

The callback is expected to parse the fragment, in which the `access_token` is provided and push it back to your server so that it can be kept as part of the user session.

In this case, the callback is implemented as a simple JavaScript (`static/callback.html`)script that sends the parsed fragment to the *token validation endpoint* on the web app server and waits for a response, which in this case is located at `/catchtoken`.

The token validation endpoint *MUST* validate the provided `access_token`, failure to do so makes your application vulnerable to the [confused deputy problem](http://en.wikipedia.org/wiki/Confused_deputy_problem).

In this sample, the validation is performed as follows:

* Import the `logmein-webclient-be` module and instantiate the client:

```javascript
var logmein = require('logmein-webclient-be'),
    client = logmein();
```

* Implement the token validation endpoint:

```javascript
// This is where the server can validate/keep the acess token
app.get("/catchtoken", function(request, response)
{
    // Check first if the access was denied
    if(request.query.error)
    {
        // Return an access denied error
        response.writeHead(403);
        response.end();
    }
    else
    {
        client.validateToken(request.query.access_token,
            function(r) {
               // Just return a success code to the client
               session.access_token = request.query.access_token;
               response.writeHead(200);
               response.end();
            },
            function(r) {
              // Return a token expired/invalid error
              response.writeHead(498);
              response.end();
            },
            function(e) {
              // An error happened
              response.writeHead(500);
              response.end(e);
            }
        );  
    }
});
```
> The token validation returns empty responses containing just the response codes to the callback script but your implementation may differ.

Once the token has been validated, and a response gets to the callback script, if the login has been successful, it will redirect the browser to the endpoint provided in the `state` field, which was `welcome` in this case.

```javascript
window.location = params["state"];
```
The `welcome` enpoint serves a page template that is filled in using the user email provided by the authorization server:

```javascript
client.getResource(session.access_token, "/me", undefined,
    function(r) {
        r.on('data', function(chunk) {
            session.me = JSON.parse(chunk);
            ...
        },
        function(e) {
            // An error happened
            response.writeHead(500);
            response.end(e);
        }
    }
);
```
