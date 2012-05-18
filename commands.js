module.exports = function(msg, socket, db) {
	var m = require('./message.js')
		, c = require('./channel.js')
		, e = require('./email.js')
		, password = require('password');

	var helpText = "<div> \
									<div><strong>/help</strong></div> \
									<div><strong>/adduser</strong> username email</div> \
									</div>";
	
	var match = msg.value.match(/^\/.*\s?$/);
	if(match != null){
		var text = null;
		
		try {
			switch (msg.value.match(/^(\/\w*)(.*|\n).*\s?$/)[1]) {
				case "/join":
					var channel = msg.value.match(/^\/\w*[ ](\w*)\s?$/)[1]
					socket.emit('join', channel);
					c.join(channel, socket, db);
				break;
				case "/adduser":
					var pattern = msg.value.match(/^\/\w*[ ](\w*)[ ]([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4})\s?$/i);
					var name = pattern[1]
					var email = pattern[2]
					try {
						db.collection('users', function(err, collection) {
							collection.save({name: name, email: email}, function() {
								emitMessage('Added new user.');
								e.sendWelcome(name, email, password(3));
							});
						});
					} catch(e) {
						emitMessage('Could not save user!');
						console.log('Could not save user!.' + e);
					}
				break;
				case "/help":
				default:
					emitMessage(helpText);
			}
		} catch(e) {
			console.log('Exception throw processing command.', msg, e);
			emitMessage("Exception thrown while processing your command. <br/>" + helpText);
		}
		return true;
	} else {
		return false;
	}
	
	function emitMessage (value) {
		console.log('channel: ' + msg.channel, 'name: help', 'message: ' + value);
		socket.emit('new message', new m.Message(msg.channel, 'help', "<br/>" + value, new Date()));
	}
};
