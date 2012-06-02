var nconf = require('nconf')
	, server = require("emailjs").server.connect({
			user: nconf.get('smtp_username'),
			password: nconf.get('smtp_password'),
			host: nconf.get('smtp_host'),
			port: nconf.get('smtp_port'),
			ssl: nconf.get('smtp_ssl'),
			tls: nconf.get('smtp_tls')
		});

exports.sendWelcome = function(name, email, password) {
	console.log(name, email, password);
	sendEmail(email, "Welcome to Many Minds", "Here is your password: " + password);
};

function sendEmail(to, subject, body) {
	// send the message and get a callback with an error or details of the message that was sent
	server.send({
		 text:    body,
		 from:    "Many Minds",
		 to:      to,
		 subject: subject
	}, function(err, message) { console.log(err || message); });
}