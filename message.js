exports.Message = function (channel, username, value, timestamp) {
	this.channel = channel;
	this.username = username;
	this.value = value;
	this.timestamp = timestamp;
	this.path = null;
	this.contentType = 'text/plain';
}

exports.getCommand = function (message) {
	var match = message.value.match(/^\/.*/);
	if(match != null){
		return match[0];
	}
}

exports.save = function (message, db) {
	try {
		db.collection('messages', function(err, collection) {
			collection.save(message, function() {
			});
		});
	} catch(e) {
		console.log('Could not save message.' + e);
	}
}
