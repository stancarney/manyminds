var m = require('./message.js')
	, mongo = require('mongodb')
	, commands = require('./commands.js');

exports.join = function(channel, socket, db) {
	//check to see if it exists.

	//if not create.
};

exports.message = function(channel, message, socket, db) {
	socket.get('nickname', function (err, nickname) {

		var msg = new m.Message(channel, nickname, message, new Date());

		if (!commands(msg, socket, db)) {
			m.save(msg, db);
			socket.emit('new', msg);
			socket.broadcast.emit('new', msg);
		}
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
						socket.emit('day', {timestamp: records[i].timestamp});
					}
				}
			}

			socket.emit('complete');
		});
	});
};

exports.refresh = function(channel, socket, express, db) {
	var BSON = mongo.BSONPure;
	db.collection('messages', function(err, collection) {

		collection.find({'channel': channel}).sort({timestamp: -1}).limit(100).toArray(function(err, records) {
			for (var i in records.reverse()) {
				if (records[i] != null) {
					console.log('name: ' + records[i].nickname, 'message' + records[i].message);
					socket.emit('new', records[i]);
				}
			}
		});
	});
};

exports.typing = function(channel, socket, db) {
	socket.get('nickname', function (err, nickname) {
		socket.broadcast.emit('typing', { id: socket.id });
	});
};

exports.setNickName = function(channel, nickname, socket, db) {
	socket.set('nickname', nickname, function () {

		//if exists
		socket.emit('remove user', { nickname: nickname, id: socket.id });
		socket.broadcast.emit('remove user', { nickname: nickname, id: socket.id });
		socket.emit('add user', { nickname: nickname, id: socket.id });
		socket.broadcast.emit('add user', { nickname: nickname, id: socket.id });

		var msg = new m.Message('system', nickname + ' is now known as ' + nickname, new Date()); //need to sort old name.
		m.save(msg);
		socket.broadcast.emit('message', m);
	});
};

function utcDay(timestamp) {
	return parseInt(timestamp.getTime() / 100000000);
}
