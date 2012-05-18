var express = require('express')
		, MemoryStore = express.session.MemoryStore
		, Session = require('connect').middleware.session.Session
		, app = express.createServer()
		, sessionStore = new MemoryStore()
		, io = require('socket.io').listen(app)
		, mongo = require('mongodb')
		, db = new mongo.Db('wayd', new mongo.Server('localhost', 27017, {}), {})
		, parseCookie = require('connect').utils.parseCookie
		, urlParser = require('url')
		, path = require('path')
		, fs = require('fs')
		, queryString = require('querystring')
		, utils = require('./utils.js')()
		, c = require('./channel.js');

var authCheck = function (req, res, next) {
	url = req.urlp = urlParser.parse(req.url, true);

	if (req.session && req.session.user || url.pathname == "/") {
		next();
		return;
	}

	if (url.pathname.startsWith("/chat")) {
		res.writeHead(403);
		res.end('Sorry you are unauthorized.\n\nFor a login use: /login?name=max&pwd=herewego');
		return;
	}

	next();
}

app.configure(function() {
	app.use(express.cookieParser('secret'));
	app.use(express.session({store: sessionStore , secret: 'secret' , key: 'express.sid'}));
	app.use(express.bodyParser());
	app.use("/public", express.static(__dirname + '/public'));
	app.use(authCheck);
	app.set('view engine', 'ejs');
	app.set('view options', {
		open: '{{',
		close: '}}',
		layout: false
	});
});

app.listen(8000);

app.get('/', function (req, res) {
	res.render(__dirname + '/views/index');
});

app.post('/login', function (req, res) {

	db.collection('users', function(err, collection) {
		collection.findOne({'name': req.body.username, 'password': req.body.password}, function(err, obj) {
			if(obj) {
				req.session.user = obj;
				res.redirect('/chat?c=' + req.body.channels.replace(/ /g,"&c="));
			} else {
				res.writeHead(403);
				res.end('Sorry you are unauthorized.\n\nFor a login use: /login?name=max&pwd=herewego');
			}
		});
	});
});

app.get('/logout', function (req, res) {
	req.session.destroy();
	res.redirect('/')
});

app.get(/^\/chat\\?(?:&?c=\w*)*$/, function (req, res) {
	res.render(__dirname + '/views/chat', { user: req.session.user });
});

app.post('/upload/:channel', function (req, res) {
	var user = req.session.user;
	var channel = req.params.channel;

	for (i in req.files){
		var file = req.files[i];
		c.file(channel, user, file, io.sockets.in(channel), db);
	}

	console.log('channel: ' + channel + ' received file: ' + req.files + ' for: ' + user.name + ' ');
});

app.get('/f/:file', function (req, res) {
	var filePath = '/tmp/' + req.params.file;
	path.exists(filePath, function(exists) {
		if (exists) {
			fs.readFile(filePath, function(error, content) {
				if (error) {
					res.writeHead(500);
					res.end();
				} else {
					res.writeHead(200);
					res.end(content, 'utf-8');
				}
			});
		} else {
			res.writeHead(404);
			res.end();
		}
	});
});

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
	console.log('MAIN ' + hs.sessionID + ' connected!');

	var intervalID = setInterval(function () {
		hs.session.reload(function () {
			hs.session.touch().save();
		});
	}, 60 * 1000);

	socket.set('user', hs.session.user);

	socket.on('disconnect', function () {
		console.log('MAIN ' + hs.sessionID + ' disconnected!');
		clearInterval(intervalID);
	});

	socket.on('message', function (channel, value) {
		c.message(channel, value, socket, db);
	});

	socket.on('scroll', function (channel, id) {
		c.scroll(channel, id, socket, db);
	});

	socket.on('quit', function () {
		c.quit(socket, db);
	});

	socket.on('join', function (channel) {
		c.join(channel, socket, db);
	});

	socket.on('leave', function (channel) {
		c.leave(channel, socket, db);
	});

	socket.on('typing', function (channel) {
		c.typing(channel, socket, db);
	});
});

db.open(function() {
});
