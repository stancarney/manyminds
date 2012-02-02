var express = require('express')
		, app = express.createServer()
		, io = require('socket.io').listen(app)
		, mongo = require('mongodb')
		, db = new mongo.Db('wayd', new mongo.Server('localhost', 27017, {}), {});

app.listen(8080);

app.use(express.cookieParser());
app.use(express.session({ secret: "keyboard cat" }));
app.use(express.bodyParser());

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

io.sockets.on('connection', function (socket) {

	socket.on('set nickname', function (name) {
		socket.set('nickname', name, function () {
			socket.emit('remove user', { name: name, id: socket.id });
			socket.broadcast.emit('remove user', { name: name, id: socket.id });
			socket.emit('add user', { name: name, id: socket.id });
			socket.broadcast.emit('add user', { name: name, id: socket.id });
		});
	});

	socket.on('message', function (message) {
		socket.get('nickname', function (err, name) {

			var m = {
				name: name,
				message: message.value
			};

			db.collection('messages', function(err, collection) {
				collection.insert(m, function(){});
			});

			socket.emit('chat', { user: name, value: message.value});
			socket.broadcast.emit('chat', { user: name, value: message.value});
		});
	});

	socket.on('refresh', function () {
		db.collection('messages', function(err, collection) {
			collection.find({}, function(err, cursor) {
				cursor.each(function(err, rec) {
					if(rec != null){ //not sure why this is null sometimes.
						console.log('name: ' + rec.name, 'message' + rec.message);
						socket.emit('chat', { user: rec.name, value: rec.message });
					}
				});
			});
		});
	});

	socket.on('typing', function () {
		socket.get('nickname', function (err, name) {
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

db.open(function() {});
