var express = require('express');
var app = express.createServer()
		, io = require('socket.io').listen(app);

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
	req.session.user = req.body.nickname
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
			socket.emit('chat', { user: name, value: message.value});
			socket.broadcast.emit('chat', { user: name, value: message.value});
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

