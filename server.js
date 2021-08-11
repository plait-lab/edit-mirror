const http = require("http");

const requestListener = function (req, res) {
  res.writeHead(200);
  console.log(req);
  res.end("Hello, world!");
}

const server = http.createServer(requestListener);
server.listen(8080);
