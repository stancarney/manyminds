var app = require('express').createServer()
  , io = require('socket.io').listen(app);

app.listen(8080);

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
	console.log('Serving file');
});

io.sockets.on('connection', function (socket) {
  socket.on('set nickname', function (name) {
    socket.set('nickname', name, function () {
      socket.emit('ready');
	    console.log('Set nickname ', name);
    });
  });

  socket.on('messsage', function () {
    socket.get('value', function (err, value) {
      console.log('Chat message by ', value);
    });
  });
});

