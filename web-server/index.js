const os = require("os");
const fs = require("fs");
const path = require("path");
const http = require("http");
const formidable = require("formidable");

// Constants

const PORT = 4040;
const DATA_DIR = os.homedir() + "/edit-mirror-web-server-data";

// HTTP helpers

function respond(res, code, content) {
  res.writeHead(code, { "Content-Type": "application/json" });
  if (content) {
    res.end(JSON.stringify(content));
  } else {
    res.end();
  }
}

function ensureContains(res, hay, hayName, needle) {
  if (!(needle in hay)) {
    respond(res, 400, `Missing ${hayName} '${needle}'`);
  }
}

// Storage manager

function store(serverTimestamp, clientId, dataTarballTempPath, callback) {
  fs.readdir(DATA_DIR, (err, clientDirs) => {
    if (err) {
      return callback({ code: 500, content: err });
    }
    if (!clientDirs.includes(clientId)) {
      return callback({
        code: 400,
        content: `Forbidden client id '${clientId}'`
      });
    }
    const uniqueSuffix = path.basename(dataTarballTempPath);
    fs.rename(
      dataTarballTempPath,
      `${DATA_DIR}/${clientId}/${serverTimestamp}-${uniqueSuffix}.tar.gz`,
      err => {
        if (err) {
          return callback({ code: 500, content: err });
        }
        return callback(null);
      }
    )
  });
}

// Handlers

function handlePost(req, res) {
  switch (req.url) {
    case "/upload":
      const serverTimestamp = new Date().getTime();

      formidable().parse(req, (err, fields, files) => {
        if (err) {
          console.log(err);
          return respond(res, 400, "Error parsing form: " + err.toString());
        }

        ensureContains(res, fields, "field", "client_id");
        ensureContains(res, fields, "field", "client_version");
        ensureContains(res, fields, "field", "client_timestamp");

        ensureContains(res, files, "file", "data_tarball");

        const clientId = fields["client_id"];
        const dataTarballPath = files["data_tarball"].path;

        store(serverTimestamp, clientId, dataTarballPath, err => {
          if (err) {
            respond(res, err.code, err.content);
          } else {
            respond(res, 200);
          }
        });
      });

      break;

    default:
      respond(res, 404, `Unsupported POST URL '${req.url}'`);
      break;
  }
}

function handleGet(req, res) {
  switch (req.url) {
    case "/latest-client-version":
      respond(res, 500, "Under construction");
      // TODO return actual version, possibly stored in a file or something,
      // maybe env vars or parsing the actual client file
      // respond(res, 200, "0.1.0");
      break;

    case "/latest-client":
      respond(res, 500, "Under construction");
      // TODO return client using readFile
      break;

    default:
      respond(res, 404, `Unsupported GET URL '${req.url}'`);
      break;
  }
}

// Main

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
      respond(res, 404, `Unsupported request method '${req.method}'`);
      break;
  }
}

if (!fs.existsSync(DATA_DIR)) {
  console.error(`Error: Data directory '${DATA_DIR}' does not exist`);
  process.exit(1);
}

const server = http.createServer(listener);

server.on("clientError", (err, socket) => {
  console.log(err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

server.listen(PORT);
console.log(`Listening on port ${PORT}...`);
