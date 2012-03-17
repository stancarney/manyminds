exports.Message = function (nickname, value, timestamp) {
	this.nickname = nickname;
	this.value = value;
	this.timestamp = timestamp;
}

exports.getCommand = function (message) {
	var match = message.value.match(/^\/.*/);
	if(match != null){
		return match[0];
	}
}