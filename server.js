const fs = require("fs");
const path = require("path");
const http = require("http");
const formidable = require("formidable");

const PORT = 4040;
const DATA_DIR = "data";

function store(timestamp, clientId, dataTarballTempPath, callback) {
  fs.readdir(DATA_DIR, (err, clientDirs) => {
    if (err) {
      return callback({ code: 500, val: err });
    }
    if (!clientDirs.includes(clientId)) {
      return callback({ code: 400, val: `Forbidden client id '${clientId}'`});
    }
    const uniqueSuffix = path.basename(dataTarballTempPath);
    fs.rename(
      dataTarballTempPath,
      `${DATA_DIR}/${clientId}/${timestamp}-${uniqueSuffix}.tar.gz`,
      err => {
        if (err) {
          return callback({ code: 500, val: err });
        }
        return callback(null);
      }
    )
  });
}

function handlePost(req, res) {
  switch (req.url) {
    case "/upload":
      const timestamp = new Date().getTime();

      const form = formidable()

      form.parse(req, (err, fields, files) => {
        if (err) {
          res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
          res.end(String(err));
          return;
        }

        if (!("client_id" in fields)) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing field 'client_id'");
          return;
        }

        if (!("client_version" in fields)) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing field 'client_version'");
          return;
        }

        if (!("data_tarball" in files)) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing file 'data_tarball'");
          return;
        }

        const clientId = fields["client_id"];
        // const clientVersion = fields["client_version"];
        const dataTarballPath = files["data_tarball"].path;

        store(timestamp, clientId, dataTarballPath, err => {
          if (err) {
            res.writeHead(err.code);
            res.end(String(err.val));
          } else {
            res.writeHead(200);
            res.end();
          }
        });
      });

      break;

    default:
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Unsupported POST URL '${req.url}'`);
      break;
  }
}

function handleGet(req, res) {
  switch (req.url) {
    case "/version":
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("1.0.0"); // TODO return actual version using env vars
      break;

    case "/latestClient":
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("TODO"); // TODO return client using readFile
      break;

    default:
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Unsupported GET URL '${req.url}'`);
      break;
  }
}

function listener(req, res) {
  console.log(`Received request: ${req.method} ${req.url}`);
  switch (req.method) {
    case "POST":
      handlePost(req, res);
      break;

    case "GET":
      handleGet(req, res);
      break;

    default:
      res.writeHead(404);
      res.end(`Unsupported request method '${req.method}'`);
      break;
  }
}

const server = http.createServer(listener);

server.on('clientError', (err, socket) => {
  console.log(err);
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT);
console.log(`Listening on port ${PORT}...`);
