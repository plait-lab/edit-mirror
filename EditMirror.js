#!/user/bin/env node

////////////////////////////////////////////////////////////////////////////////
// Imports

const util = require("util");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const https = require("https");

const chokidar = require("chokidar");
const FormData = require("form-data");
const tar = require("tar");

const read = util.promisify(fs.read);

//////////////////////////////////////////////////////////////////////////////////
// Constants

const VERSION = "1.0";

const PLUGIN_DIR = "___edit-mirror___";
const LOGS_DIR = PLUGIN_DIR + "/logs";
const FILE_LOG = LOGS_DIR + "/files";
const ID_PATH = PLUGIN_DIR + "/id.txt";

const FILE_URI_PREFIX = "file://";

////////////////////////////////////////////////////////////////////////////////
// Helpers

// IO helpers

async function get(n) {
  const buffer = await read(0, Buffer.alloc(1), 0, 1, null);
  return buffer.toString("utf8");
}

async function getLine() {
  let line = "";
  while (true) {
    const c = await get(1);
    if (c === "\n") {
      break;
    }
    line += c;
  }
  return line.trim();
}

function log(text) {
  const timestamp = new Date().getTime();
  fs.appendFileSync(
    "/Users/jlubin/Desktop/log.txt",
    "[" + timestamp + "] " + text
  );
}

// JSON RPC helpers

function sendMessage(content) {
  console.log("Content-Length: " + content.length + "\r\n\r\n" + content);
}

function sendResponse(id, result) {
  sendMessage(JSON.stringify({
    id: id,
    result: result,
    jsonrpc: "2.0"
  }));
}

////////////////////////////////////////////////////////////////////////////////
// Storage manager

// TODO we might want to buffer this?
async function store(timestamp, kind, sourcePath, sourceContent) {
  const dir = FILE_LOG_DIR + "/" + sourcePath;
  const filename = dir + "/" + timestamp + "-" + kind;

  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(filename, sourceContent);
}

////////////////////////////////////////////////////////////////////////////////
// File watcher

function watchHandler(kind) {
  return (async path => {
    // Handles https://github.com/paulmillr/chokidar/issues/544
    if (!path.endsWith(".elm")) {
      return;
    }
    const content = kind === "unlink" ? "" : await fsp.readFile(path);
    store(new Date().getTime(), "watched-" + kind, path.slice(3), content);
  });
}

function watchFiles() {
  chokidar.watch(["**/*.elm", "elm.json"], { ignored: PLUGIN_DIR + "/**" })
    .on("add", watchHandler("add"))
    .on("change", watchHandler("change"))
    .on("unlink", watchHandler("unlink"));
}

////////////////////////////////////////////////////////////////////////////////
// Uploader

// 0. tar and gzip log folder
// 1. Send form data request to Berkeley server with tarred file stream
// 2. Wait for ACK response from Berkeley server
// 3. Delete files locally
function uploadData() {
  const form = new FormData();

  form.append("client_version", VERSION);

  const zippedStream =
    tar.create(
      { gzip: true
      },
      [ PLUGIN_DIR ]
    );
  form.append("data_tarball", zippedStream);

  const req = http.request({
    method: "POST",
    host: "TODO",
    path: "TODO",
    headers: form.getHeaders()
  }, res => {
    switch (res.statusCode) {
      case 200: // OK
        // This needs to be synchronous/atomic because it has to happen
        // before processing any further events
        fs.rmdirSync(LOG_DIR, { recursive: true, force: true });
        fs.mkdirSync(LOG_DIR, { recursive: true });
        res.resume();
        break;

      default: // Error
        res.setEncoding("utf8");
        let rawData = "";
        res.on("data", chunk => { rawData += chunk; });
        res.on("end", () => {
          log(
            "Server responded with status code "
              + res.statusCode
              + ": "
              + rawData
          );
        });
        break;
    }
  });

  form.pipe(req);
}

////////////////////////////////////////////////////////////////////////////////
// Language server protocol

async function listen(handler) {
  while (true) {
    const header = {};
    while (true) {
      const line = await getLine();
      if (line.length === 0) {
        break;
      }
      const [key, val] = line.split(": ");
      header[key] = val;
    }

    const contentLength = parseInt(header["Content-Length"]);
    const content = await get(contentLength);

    // Body
    handle(JSON.parse(content));
  }
}

let ROOT_PATH = null;
let ID = null;

async function handle(msg) {
  const timestamp = new Date().getTime();

  switch (msg.method) {
    case "initialize":
      const rootUri = msg.params.rootUri;
      if (!rootUri.startsWith(FILE_URI_PREFIX)) {
        throw new Error("Non-file URIs not supported: '" + rootUri + "'");
      }
      ROOT_PATH = rootUri.substring(FILE_URI_PREFIX.length);

			try {
        ID = await fsp.readFile(ID_FILE_PATH);
			} catch {
				return;
			}

			watchFiles();

			sendResponse(
				msg.id,
				{ capabilities: { textDocumentSync: 1 } }
			);

      break;

    case "didChange":
      const uri = msg.params.textDocument.uri;
      if (!uri.startsWith(FILE_URI_PREFIX)) {
        log("Non-file URIs not supported: '" + uri + "'");
        return;
      }

      const path = uri.substring(FILE_URI_PREFIX.length);
      if (!path.startsWith(ROOT_PATH)) {
        throw new Error(
          "Text document path '"
            + path
            + "' does not begin with root path '"
            + ROOT_PATH
            + "'"
        );
      }

      const contentChanges = msg.params.contentChanges;
      const lastContentChange = contentChanges[contentChanges.length - 1];
      if ("range" in lastContentChange) {
        throw new Error(
          "Last content change is non-incremental: "
            + JSON.stringify(lastContentChange)
        );
      }

      const sourceFilename = path.substring(ROOT_PATH.length + 1);
      const sourceContent = lastContentChange.text;

      await store(timestamp, "buffer", sourceFilename, sourceContent);

      // TODO check if necessary to upload (it's been at least 1 day, etc.)

      break;

    case "didOpen": // No new info
    case "didClose": // No new info
    case "didSave": // Handled by file system watcher
      break;

    default:
      break;
  }
}

////////////////////////////////////////////////////////////////////////////////
// Uploader

function tryUpdate() {
  // TODO
  // make http request to berkeley server for latest version string
  // if it's different than VERSION, make another request for the latest file
  // download that file, replace current file with it, will be updated for next
  // run
}

////////////////////////////////////////////////////////////////////////////////
// Main

tryUpdate();
listen(handle);
