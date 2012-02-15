var express = require('express')
		, MemoryStore = express.session.MemoryStore
		, Session = require('connect').middleware.session.Session
		, app = express.createServer()
		, sessionStore = new MemoryStore()
		, io = require('socket.io').listen(app)
		, mongo = require('mongodb')
		, db = new mongo.Db('wayd', new mongo.Server('localhost', 27017, {}), {})
		, parseCookie = require('connect').utils.parseCookie
		, urlParser = require('url');

var authCheck = function (req, res, next) {
	url = req.urlp = urlParser.parse(req.url, true);

	if (req.session && req.session.auth == true || url.pathname == "/") {
		next();
		return;
	}

	if (url.pathname == "/chat") {
		res.writeHead(403);
		res.end('Sorry you are unauthorized.\n\nFor a login use: /login?name=max&pwd=herewego');
		return;
	}

	next();
}

app.configure(function() {
	app.use(express.cookieParser());
	app.use(express.session({store: sessionStore , secret: 'secret' , key: 'express.sid'}));
	app.use(express.bodyParser());
	app.use("/public", express.static(__dirname + '/public'));
	app.use(authCheck);
});

app.set('view options', {
	open: '{{',
	close: '}}',
	layout: false
});

app.register('.html', require('ejs'));

app.listen(8080);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/views/index.html');
});

app.post('/login', function (req, res) {
	req.session.user = req.body.nickname;
	req.session.auth = true;
	res.redirect('/chat')
});

app.get('/logout', function (req, res) {
	req.session.destroy();
	res.redirect('/')
});

app.get('/chat', function (req, res) {
	res.render(__dirname + '/views/chat.html', { user: req.session.user });
});

function Message(nickname, message, timestamp) {
	this.nickname = nickname;
	this.message = message;
	this.timestamp = timestamp;
}

io.set('authorization', function (data, accept) {
	if (data.headers.cookie) {
		data.cookie = parseCookie(data.headers.cookie);
		data.sessionID = data.cookie['express.sid'];

		data.sessionStore = sessionStore;
		sessionStore.get(data.sessionID, function (err, session) {
			if (err || !session) {
				accept('Error', false);
			} else {

				data.session = new Session(data, session);
				accept(null, true);
			}
		});
	} else {
		return accept('No cookie transmitted.', false);
	}
});

io.sockets.on('connection', function (socket) {

	var hs = socket.handshake;
	console.log('A socket with sessionID ' + hs.sessionID + ' connected!');

	var intervalID = setInterval(function () {
		hs.session.reload(function () {
			hs.session.touch().save();
		});
	}, 60 * 1000);

	socket.on('disconnect', function () {
		console.log('A socket with sessionID ' + hs.sessionID + ' disconnected!');
		clearInterval(intervalID);
	});

	socket.on('set nickname', function (nickname) {
		socket.set('nickname', nickname, function () {

			//if exists
			socket.emit('remove user', { nickname: nickname, id: socket.id });
			socket.broadcast.emit('remove user', { nickname: nickname, id: socket.id });
			socket.emit('add user', { nickname: nickname, id: socket.id });
			socket.broadcast.emit('add user', { nickname: nickname, id: socket.id });

			var m = new Message('system', nickname + ' is now known as ' + nickname, new Date()); //need to sort old name.
			save(m);
			socket.broadcast.emit('message', m);
		});
	});

	socket.on('message', function (message) {
		socket.get('nickname', function (err, nickname) {

			var m = new Message(nickname, message.value, new Date());
			save(m);
			socket.emit('new', m);
			socket.broadcast.emit('new', m);
		});
	});

	socket.on('scroll', function (id) {

		var BSON = mongo.BSONPure;
		db.collection('messages', function(err, collection) {

			collection.find({'_id': {$lt: new BSON.ObjectID(id)}}).sort({_id: -1}).limit(100).toArray(function(err, records) {
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
	});

	socket.on('refresh', function (id) {

		var BSON = mongo.BSONPure;
		db.collection('messages', function(err, collection) {
			var query = null;
			if (id) query = {'_id': {$gt: new BSON.ObjectID(id)}};
			else query = {};

			collection.find(query, function(err, cursor) {
				cursor.sort({timestamp: -1}).limit(100).toArray(function(err, records) {
					for (var i in records.reverse()) {
						if (records[i] != null) {
							console.log('name: ' + records[i].nickname, 'message' + records[i].message);
							socket.emit('new', records[i]);
						}
					}
				});
			});
		});
	});

	socket.on('typing', function () {
		socket.get('nickname', function (err, nickname) {
			socket.broadcast.emit('typing', { id: socket.id });
		});
	});
});

db.open(function() {
});

function save(message) {
	try {
		db.collection('messages', function(err, collection) {
			collection.save(message, function() {
			});
		});
	} catch(e) {
		console.log('Could not save message.' + e);
	}
}

function utcDay(timestamp) {
	return parseInt(timestamp.getTime() / 100000000);
}
