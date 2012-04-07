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
		, queryString = require('querystring')
		, utils = require('./utils.js')()
		, c = require('./channel.js');

var authCheck = function (req, res, next) {
	url = req.urlp = urlParser.parse(req.url, true);

	if (req.session && req.session.auth == true || url.pathname == "/") {
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

app.listen(8000);

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/views/index.html');
});

app.post('/login', function (req, res) {
	req.session.user = req.body.username;

	//send to channel

	req.session.auth = true;
	res.redirect('/chat?c=' + req.body.channels.replace(/ /g,"&c="));
});

app.get('/logout', function (req, res) {
	req.session.destroy();
	res.redirect('/')
});

app.get(/^\/chat\\?(?:&?c=\w*)*$/, function (req, res) {
	res.render(__dirname + '/views/chat.html', { user: req.session.user });
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
		c.setNickName('default', nickname, socket, db);
	});

	socket.on('message', function (message) {
		c.message(message.channel, message.value, socket, db);
	});

	socket.on('scroll', function (channel, id) {
		c.scroll(channel, id, socket, db);
	});

	socket.on('refresh', function (channel) {
		socket.emit('join', {channel: channel});
		c.refresh(channel, socket, express, db);
	});

	socket.on('typing', function () {
		c.typing('default', socket, db);
	});
});

db.open(function() {
});
