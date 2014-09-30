// Load dependencies
var express = require('express'),
	crypto = require("crypto"),
	nunjucks = require("nunjucks"),
	path = require( "path" ),
	app = express(),
	nunjucksEnv = new nunjucks.Environment( 
		new nunjucks.FileSystemLoader(path.join(__dirname, '/public/templates' )));

var logmein = require('logmein-webclient-be'),
	client = logmein();

app.use(express.static(__dirname)),
nunjucksEnv.express( app );

var session = {};

// This serves the callback script so that it extracts
// the fragment parameters in the client to send
// it to the server via the catchtoken endpoint
app.use("/callback", express.static(__dirname + "/public/static/callback.html"));

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
		// The token MUST be validated, failure to do so
		// may result makes your app vulnerable to the 
		// confused deputy problem !!!

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

/**
 * This function returns the URL of the Gravatar 
 * image for the provided email. 
 */
function getGravatarUrl(email, args) {

	var md5 = function(str) {
	    str = str.toLowerCase().trim();
	    var hash = crypto.createHash("md5");
	    hash.update(str);
	    return hash.digest("hex");
	};

    args = args || "";
    var BASE_URL = "//www.gravatar.com/avatar/";
    
    return (BASE_URL + md5(email) + args).trim();
}

/**
 * Forge a response that will redirect the
 * browser to the index page (login).
 */
function redirectToHome(request, response) {

   	response.writeHead(301, {
  		Location: (request.socket.encrypted ? 'https://' : 'http://') +
    				request.headers.host
    	}
	);
	response.end();
}

// Welcome screen showing the user email
app.get("/welcome", function(request, response)
{
	// If we didn't get an access token redirect to 
	// the index page
	if(session.access_token==null) {

		redirectToHome(request, response);
	}
	else {

		// Obtain the user's email using the 
		// provided access token
		client.getResource(session.access_token, "/profile", undefined,

			function(r) {

            	r.on('data', function(chunk) {
            		
            		session.profile = JSON.parse(chunk);

            		response.render( "welcome.html", 
            			{ 
            				profile: session.profile, 
            				avatarUrl: getGravatarUrl(session.profile.email, ".jpg?s=40")
            			}
            		);	
					return;
            	});	
			},
			function(e)	{

				// An error happened
	      		response.writeHead(500);
		  		response.end(e);
			}
		);
	}
});

// Logout the current user
app.get("/logout", function(request, response) 
{
	session = {};

	redirectToHome(request, response);
});

var port = Number(process.env.PORT || 8000);

// Start listening
app.listen(port, function() {
  console.log("Listening on " + port);
});
