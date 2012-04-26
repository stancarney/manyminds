var m = require('./message.js')
	, mongo = require('mongodb')
	, commands = require('./commands.js');

exports.join = function(channel, socket, db) {
	socket.get('user', function (err, user) {
		socket.emit('join', channel);
		socket.emit('remove user', channel, socket.id ); //incase the old user still exists for some reason.
		socket.broadcast.emit('remove user', channel, socket.id );
		socket.emit('add user', channel, user.name, socket.id );
		socket.broadcast.emit('add user', channel, user.name, socket.id );

		var msg = new m.Message(channel, 'system', user.name + ' is now known as ' + user.name, new Date()); //need to sort old name.
		m.save(msg);
		socket.broadcast.emit('message', m);
	});
};

exports.message = function(channel, value, socket, db) {
	socket.get('user', function (err, user) {

		var msg = new m.Message(channel, user.name, value, new Date());

		if (!commands(msg, socket, db)) {
			m.save(msg, db);
			socket.emit('new', msg);
			socket.broadcast.emit('new', msg);
		}
	});
};

exports.refresh = function(channel, socket, db) {
	var BSON = mongo.BSONPure;
	db.collection('messages', function(err, collection) {

		collection.find({'channel': channel}).sort({timestamp: -1}).limit(100).toArray(function(err, records) {
			for (var i in records.reverse()) {
				if (records[i] != null) {
					console.log('channel: ' + records[i].channel, 'name: ' + records[i].username, 'message' + records[i].message);
					socket.emit('new', records[i]);
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
					socket.emit('old', records[i]);

					//emit day break.
					var next = parseInt(i) + 1;
					if (next < records.length && utcDay(records[i].timestamp) > utcDay(records[next].timestamp)) {
						socket.emit('day', channel, records[i].timestamp);
					}
				}
			}
			socket.emit('complete', channel);
		});
	});
};

exports.typing = function(channel, socket, db) {
	socket.volatile.broadcast.emit('typing', channel, socket.id);
};

function utcDay(timestamp) {
	return parseInt(timestamp.getTime() / 100000000);
}
