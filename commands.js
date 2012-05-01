module.exports = function(message, socket, db) {
	var m = require('./message.js');
	var c = require('./channel.js');

	if (m.getCommand(message)) {
		var text = null;
		switch (message.value.match(/^(\/\w*)([ ]|\n)\w*\s*$/)[1]) {
			case "/join":
				var channel = message.value.match(/^\/\w*[ ](\w*)\n*$/)[1]
				socket.emit('join', channel);
				c.join(channel, socket, db);
			break;
			case "/help":
			default:
				text = "<strong>/help</strong><br/>" +
						"<strong>/adduser</strong> username email<br/>";
				socket.emit('new', new m.Message('', text, new Date()));
		}
		return true;
	} else {
		return false;
	}
};
