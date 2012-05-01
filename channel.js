var m = require('./message.js')
	, mongo = require('mongodb')
	, commands = require('./commands.js')
  , channels = {};

exports.join = function(channel, socket, db) {
	socket.get('user', function (err, user) {

		//incase the old user is still connected.
		removeUser(channel, user);
		socket.broadcast.to(channel).emit('remove user', channel, user.name);
		
		addUser(channel, user);
		socket.broadcast.to(channel).emit('add user', channel, user.name);

		var c = channels[channel];
		for (var i in c) {
			socket.emit('add user', channel, c[i], user.name);
		}

		var msg = new m.Message(channel, 'system', user.name + ' joined!', new Date());
		m.save(msg, db);
		emitMessage(socket.broadcast.to(msg.channel), msg);
	});
};

exports.quit = function(socket, db) {
	socket.get('user', function (err, user) {
		for (var c in channels) {
			var v = channels[c];
			for (var u in v) {
				if(v[u] == user.name) {
					var msg = new m.Message(c, 'system', user.name + ' quit!', new Date());
					m.save(msg, db);
					emitMessage(socket.broadcast.to(msg.channel), msg);
					removeUser(c, user);
					socket.emit('remove user', c, user.name);
				}
			}
		}
	});
};

exports.message = function(channel, value, socket, db) {
	socket.get('user', function (err, user) {
		
		var msg = new m.Message(channel, user.name, value, new Date());
		if (!commands(msg, socket, db)) {
			m.save(msg, db);
			emitMessage(socket, msg);
			emitMessage(socket.broadcast.to(channel), msg);
		}
	});
};

exports.file = function(channel, user, value, socket, db) {
	var msg = new m.Message(channel, user.name, value, new Date());
	msg.file = 'file';
	msg.contentType = 'image/png';
	m.save(msg, db);
	socket.emit('new file', msg);
};

exports.refresh = function(channel, socket, db) {
	var BSON = mongo.BSONPure;
	db.collection('messages', function(err, collection) {

		collection.find({'channel': channel}).sort({timestamp: -1}).limit(100).toArray(function(err, records) {
			for (var i in records.reverse()) {
				if (records[i] != null) {
					emitMessage(socket, records[i]);

					var next = parseInt(i) + 1;
					if (next < records.length && utcDay(records[i].timestamp) < utcDay(records[next].timestamp)) {
						socket.emit('day forward', channel, records[i].timestamp);
					}
				}
			}
		});
	});
};

exports.scroll = function(channel, id, socket, db) {
	var BSON = mongo.BSONPure;
	db.collection('messages', function(err, collection) {

		collection.find({'_id': {$lt: new BSON.ObjectID(id)}, 'channel': channel}).sort({_id: -1}).limit(100).toArray(function(err, records) {
			for (var i in records) {
				if (records[i] != null) {
					socket.emit('old message', records[i]);

					//emit day break.
					var next = parseInt(i) + 1;
					if (next < records.length && utcDay(records[i].timestamp) > utcDay(records[next].timestamp)) {
						socket.emit('day backward', channel, records[i].timestamp);
					}
				}
			}
			socket.emit('complete', channel);
		});
	});
};

exports.typing = function(channel, socket, db) {
	socket.get('user', function (err, user) {
		socket.volatile.broadcast.to(channel).emit('typing', channel, user.name);
	});
};

function utcDay(timestamp) {
	return parseInt(timestamp.getTime() / 100000000);
}

function addUser(channel, user) {
	var c = channels[channel];
	if(c) {
		c.push(user.name);
	} else {
		channels[channel] = [user.name];
	}
}

function removeUser(channel, user) {
	var c = channels[channel];
	if(c) {
		var index = c.indexOf(user.name);
		if(index != -1) c.splice(index, 1);
	}
}

function emitMessage (socket, msg) {
	console.log('channel: ' + msg.channel, 'name: ' + msg.username, 'message: ' + msg.value);
	socket.emit('new message', msg);
}