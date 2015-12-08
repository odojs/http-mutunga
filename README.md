# http-mutunga
An http server that closes idle connections when closing

```js
var mutunga = require('http-mutunga');
var express = require('express');
var app = express();

app.get('/', function (req, res) {
  res.send('Ok');
});

var server = mutunga(app).listen(8080, function () {
  process.on('SIGTERM', function () {
    // this will properly close connections that are keep alive
    server.close(function () {
      process.exit(0);
    });
  });
});
```