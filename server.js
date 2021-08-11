const http = require("http");
const formidable = require("formidable");

function store(
  timestamp,
  clientId,
  clientVersion,
  dataTarballTempPath,
  dataTarballSize,
  callback
) {
  // TODO
  // - check if client id is allowlisted
  // - check to make sure timestamp is greater than all previous timestamp
  // - TODO check md5 somehow?
  // - rename the file at tempPath to clientId/timestamp.tar.gz
}

function handlePost(req, res) {
  switch (req.url) {
    case "/upload":
      const timestamp = new Date().getTime();

      const form = new formidable.IncomingForm()

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

        if (!("data_tarball" in fields)) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing file 'data_tarball'");
          return;
        }

        const clientId = fields["client_id"];
        const clientVersion = fields["client_version"];
        const dataTarballPath = files["data_tarball"].

        store(
          timestamp,
          fields["client_id"],
          fields["client_version"],
          files["data_tarball"].path,
          files["data_tarball"].size,
          storeErr => {
            if (storeErr) {
              res.writeHead(500);
              res.end(String(storeErr));
            } else {
              res.writeHead(200);
              res.end();
            }
          }
        );
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
server.listen(8080);
