var nconf = require('nconf')
	, server = require("emailjs").server.connect({
			user: nconf.get('smtp')['username'],
			password: nconf.get('smtp')['password'],
			host: nconf.get('smtp')['host'],
			port: nconf.get('smtp')['port'],
			ssl: nconf.get('smtp')['ssl'],
			tls: nconf.get('smtp')['tls']
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