module.exports = function(message, socket, db) {
	var m = require('./message.js');

	if (m.getCommand(message)) {
		var text = null;
		switch (message.value.match(/^(\/\w*)([ ]|\n)\w*\s*$/)[1]) {
			case "/join":
				var c = message.value.match(/^\/\w*[ ](\w*)\n*$/)[1]
					message.channel = c;
					message.value = null;
				socket.emit('join', message);	
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
