var express = require('express')
		, app = express.createServer()
		, io = require('socket.io').listen(app)
		, mongo = require('mongodb')
		, db = new mongo.Db('wayd', new mongo.Server('localhost', 27017, {}), {});

app.listen(8080);

app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));
app.use(express.bodyParser());
app.use("/public", express.static(__dirname + '/public'));

app.set('view options', {
	open: '{{',
	close: '}}',
	layout: false
});

app.register('.html', require('ejs'));

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/views/index.html');
});

app.post('/chat', function (req, res) {
	req.session.user = req.body.nickname;
	res.redirect('/chat')
});

app.get('/chat', function (req, res) {
	res.render(__dirname + '/views/chat.html', { user: req.session.user });
});

function Message(nickname, message, timestamp) {
	this.nickname = nickname;
	this.message = message;
	this.timestamp = timestamp;
}

io.sockets.on('connection', function (socket) {

	socket.on('set nickname', function (nickname) {
		socket.set('nickname', nickname, function () {

			//if exists

			socket.emit('remove user', { nickname: nickname, id: socket.id });
			socket.broadcast.emit('remove user', { nickname: nickname, id: socket.id });
			socket.emit('add user', { nickname: nickname, id: socket.id });
			socket.broadcast.emit('add user', { nickname: nickname, id: socket.id });

			var m = new Message('system', nickname + ' is now known as ' + nickname, new Date()); //need to sort old name.
			socket.broadcast.emit('message', m);
			save(m);
		});
	});

	socket.on('message', function (message) {
		socket.get('nickname', function (err, nickname) {

			var m = new Message(nickname, message.value, new Date());
			socket.emit('chat', m);
			socket.broadcast.emit('chat', m);
			save(m);
		});
	});

	socket.on('refresh', function () {
		db.collection('messages', function(err, collection) {
			collection.find({}, function(err, cursor) {
				cursor.each(function(err, rec) {
					if (rec != null) { //not sure why this is null sometimes.
						console.log('name: ' + rec.nickname, 'message' + rec.message);
						socket.emit('chat', rec);
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

	socket.on('adduser', function (user) {
		console.log('Using is typing a message');
		socket.emit('ready', {});
	});

	socket.on('deluser', function (user) {
		console.log('Using is typing a message');
		socket.emit('ready', {});
	});
});

db.open(function() {
});

function save(message) {
	db.collection('messages', function(err, collection) {
		collection.insert(message, function() {
		});
	});
}
