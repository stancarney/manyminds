var m = require('./message.js')
	, mongo = require('mongodb')
	, im = require('imagemagick')
	, commands = require('./commands.js')
  , channels = {};

exports.join = function(channel, socket, db) {
	
	socket.join(channel);

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

//leaves all channels
exports.quit = function(socket, db) {
	socket.get('user', function (err, user) {
		for (var channel in channels) {
			var users = channels[channel];
			for (var u in users) {
				if(users[u] == user.name) {
					exports.leave(channel, socket, db);
				}
			}
		}
	})
};

//leaves given channel
exports.leave = function(channel, socket, db) {
	socket.get('user', function (err, user) {
		var msg = new m.Message(channel, 'system', user.name + ' quit!', new Date());
		m.save(msg, db);
		emitMessage(socket.broadcast.to(channel), msg);
		removeUser(channel, user);
		socket.broadcast.to(channel).emit('remove user', channel, user.name);
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
	var f = value[0];
	console.log("file type: " + f.type);
	var msg = new m.Message(channel, user.name, value, new Date());
	msg.filename = f.filename;
	msg.mime = f.type;
	msg.path = f.path.replace(/\/tmp/g,"/f");
	switch (f.type) {
		case "image/png":
		case "image/jpeg":
				im.identify(f.path, function(err, features) {
					if (err) throw err
					msg.width = features.width;
					msg.height = features.height;
				});
		default:
			m.save(msg, db);
	}
	emitMessage(socket, msg);
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