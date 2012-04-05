module.exports = function(message, socket, db) {
	var m = require('./message.js');

	if (m.getCommand(message)) {
		var text = null;
		switch (message.value.match(/^(\/\w*)([ ]|\n)\w*\s*$/)[1]) {
			case "/join":
				socket.emit('join', {channelName: 'testo', channelContent: partial('channel', ['testo'])});		
			break;
			case "/help":
			default:
				text = "<strong>/help</strong><br/>" +
						"<strong>/adduser</strong> username email<br/>";
		}
		socket.emit('new', new m.Message('', text, new Date()));
		return true;
	} else {
		return false;
	}
}
