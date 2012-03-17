module.exports = function(message, socket) {
	var m = require('./message.js')
			, Message = require('./message.js').Message;

	if (m.getCommand(message)) {
		var text = null;
		switch (message.value.match(/^\/.*/)[0]) {
			case "/help":
			default:
				text = "<strong>/help</strong><br/>" +
						"<strong>/adduser</strong> username email<br/>";
		}
		socket.emit('new', new Message('', text, new Date()));
		return true;
	} else {
		return false;
	}
}