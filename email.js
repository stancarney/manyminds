var email = require('mailer');

exports.sendWelcome = function(name, email, password) {
	console.log(name, email, password);
	sendEmail(email, "Welcome to Many Minds", "Here is your password: " + password);
};

function sendEmail(to, subject, body) {
	email.send({
		host : "mail",              // smtp server hostname
		port : "25",                     // smtp server port
		domain : "moohoffa.com",            // domain used by client to identify itself to server
		to : to,
		//from : "obama@whitehouse.gov",
		subject : subject,
		body: body,
		authentication : "login",        // auth login is supported; anything else is no auth
		username : "c3Rhbg==",       // Base64 encoded username
		password : "bXI4YmVhbg=="        // Base64 encoded password
	},
	function(err, result){
		if(err){ console.log("Error occurred trying to send email.", err); }
	});
}
