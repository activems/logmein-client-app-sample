// Load dependencies
var express = require('express');
var validator = require('logmein-client-validation').TokenValidator();

// Create the web app
var app = express();

// This serves the callback script so that it extracts
// the fragment parameters in the client to send
// it to the server via the catchtoken endpoint
app.use("/callback", express.static(__dirname + "/callback.html"));

// This is where the server can validate/keep the acess token
app.get("/catchtoken", function(request, response)
{
	validator.validateToken(request.query.access_token,
	    function(request) {
	       // Just return a success code to the client
	       response.writeHead(200);
		   response.end();
	    },
	    function(request) {
	      // Return a token expired/invalid error
	      response.writeHead(498);
		  response.end();
	    }
	);	
});

// Start listening
app.listen(8000);

// Put a friendly message on the terminal
console.log("Server running at http://localhost:8000/");