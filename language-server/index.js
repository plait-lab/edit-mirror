////////////////////////////////////////////////////////////////////////////////
// Imports

const util = require("util");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const http = require("http"); // TODO: upgrade to https

const chokidar = require("chokidar");
const FormData = require("form-data");
const tar = require("tar");

const fspRead = util.promisify(fs.read);

////////////////////////////////////////////////////////////////////////////////
// Constants

const VERSION = "0.1.0";

const SERVER_HOSTNAME = "localhost";
const SERVER_PORT = 4040;

const UPLOAD_OPTIONS = {
  method: "POST",
  host: SERVER_HOSTNAME,
  port: SERVER_PORT,
  path: "/upload"
}

const LATEST_CLIENT_VERSION_OPTIONS = {
  method: "GET",
  host: SERVER_HOSTNAME,
  port: SERVER_PORT,
  path: "/latest-client-version"
}

const LATEST_CLIENT_OPTIONS = {
  method: "GET",
  host: SERVER_HOSTNAME,
  port: SERVER_PORT,
  path: "/latest-client"
}

const UPLOAD_REQUEST_THRESHOLD_HOURS = 0.002;

const PLUGIN_DIR = "___edit-mirror___";

const LOG_DIR = PLUGIN_DIR + "/log";
const PENDING_UPLOAD_DIR = PLUGIN_DIR + "/pending-upload";
const INFO_DIR = PLUGIN_DIR + "/info";
const VERSIONS_DIR = PLUGIN_DIR + "/versions";

const PENDING_UPLOAD_ARCHIVE_PATH = PENDING_UPLOAD_DIR + ".tar.gz"
const PENDING_UPLOAD_LOG_DIR = PENDING_UPLOAD_DIR + "/log"
const PENDING_UPLOAD_INFO_DIR = PENDING_UPLOAD_DIR + "/info"

const ID_PATH = INFO_DIR + "/id.txt";
const LAST_UPLOAD_REQUEST_PATH = INFO_DIR + "/last-upload-request.txt";
const DEMOGRAPHICS_PATH = INFO_DIR + "/demographics.txt";
const PLUGIN_LOG_PATH = INFO_DIR + "/plugin-log.txt"

const WATCHED_EXTENSION = ".elm";
const WATCHED_PATHS = ["**/*.elm", "elm.json"];
const IGNORED_PATHS = [PLUGIN_DIR + "/**", "elm-stuff/**"];

const FILE_URI_PREFIX = "file://";

////////////////////////////////////////////////////////////////////////////////
// Pseudo-constants (set once in init)

let ROOT_PATH = null;
let ID = null;

////////////////////////////////////////////////////////////////////////////////
// Helpers

// HTTP helpers

// Source: https://stackoverflow.com/a/56122489
function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      res.setEncoding("utf8");
      let responseBody = "";

      res.on("data", chunk => {
        responseBody += chunk;
      });

      res.on("end", () => {
        resolve({
          code: res.statusCode,
          content: JSON.parse(responseBody)}
        );
      });
    });

    req.on("error", err => {
      reject(err);
    });

    if (data) {
      req.write(data)
    }
    req.end();
  });
}

// File helpers

function copyAllVisibleSync(sourceDir, targetDir) {
  for (const file of fs.readdirSync(sourceDir)) {
    fs.copyFileSync(`${sourceDir}/${file}`, `${targetDir}/${file}`);
  }
}

function moveAllVisibleSync(sourceDir, targetDir) {
  for (const file of fs.readdirSync(sourceDir)) {
    fs.renameSync(`${sourceDir}/${file}`, `${targetDir}/${file}`);
  }
}

// Time helpers

function millisToHours(millis) {
  return millis / 3_600_000;
}

// IO helpers

async function get(n) {
  const { buffer } = await fspRead(0, Buffer.alloc(n), 0, n, null);
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

// JSON RPC helpers

function sendMessage(content) {
  process.stdout.write(
    "Content-Length: " + content.length + "\r\n\r\n" + content
  );
}

function sendResponse(id, result) {
  sendMessage(JSON.stringify({
    id: id,
    result: result,
    jsonrpc: "2.0"
  }));
}

let globalIdCounter = 1;
function sendRequest(method, params) {
  const id = globalIdCounter;
  sendMessage(JSON.stringify({
    id: id,
    method: method,
    params: params,
    jsonrpc: "2.0"
  }));
  globalIdCounter += 1;
  return id;
}

// LSP helpers

function sendPromptRequest(message, options) {
  return sendRequest("window/showMessageRequest", {
    type: 3, // Info
    message: message,
    actions: options.map(opt => ({ title: opt }))
  });
}

////////////////////////////////////////////////////////////////////////////////
// Logging

const logStream = fs.createWriteStream(PLUGIN_LOG_PATH, { flags: "a" });

function log(kind, text) {
  const timestamp = new Date().getTime();
  const prefix = `[${kind}]`.padEnd(10);
  logStream.write(`${timestamp}: ${prefix}: ${text}\n`);
}

function logInfo(text) {
  log("INFO", text);
}

function logError(text) {
  log("! ERR !", text);
}

////////////////////////////////////////////////////////////////////////////////
// User consent

let consentToUploadId = null;

function requestUpload() {
  consentToUploadId = sendPromptRequest(
    "Do you consent to uploading all edit history since your last upload?",
    ["Yes", "No"]
  );
}

function indicatesConsent(option) {
  return option === "Yes";
}

async function requestUploadIfNecessary(currentTimestamp) {
  const lastRequested = parseInt(await fsp.readFile(LAST_UPLOAD_REQUEST_PATH));
  const hoursElapsed = millisToHours(currentTimestamp - lastRequested);
  if (hoursElapsed > UPLOAD_REQUEST_THRESHOLD_HOURS) {
    logInfo("Requesting upload after " + hoursElapsed.toFixed(2) + " hours");
    await fsp.writeFile(LAST_UPLOAD_REQUEST_PATH, currentTimestamp.toString());
    requestUpload();
  }
}

////////////////////////////////////////////////////////////////////////////////
// Storage manager

async function store(timestamp, kind, sourcePath, sourceContent) {
  const sourcePathEncoding = sourcePath.replaceAll("/", "$");
  const filename = `${LOG_DIR}/${timestamp}-${kind}-${sourcePathEncoding}`

  await fsp.writeFile(filename, sourceContent);
}

////////////////////////////////////////////////////////////////////////////////
// File watcher

function watchHandler(kind) {
  return (async path => {
    // Handles https://github.com/paulmillr/chokidar/issues/544
    if (!path.endsWith(WATCHED_EXTENSION)) {
      return;
    }
    const timestamp = new Date().getTime();
    const content = kind === "unlink" ? "" : await fsp.readFile(path);
    store(timestamp, "watched-" + kind, path, content);
  });
}

function watchFiles() {
  chokidar.watch(WATCHED_PATHS, { ignored: IGNORED_PATHS })
    .on("add", watchHandler("add"))
    .on("change", watchHandler("change"))
    .on("unlink", watchHandler("unlink"));
}

////////////////////////////////////////////////////////////////////////////////
// Uploader

function upload() {
  const timestamp = new Date().getTime();

  fs.mkdirSync(PENDING_UPLOAD_DIR);

  fs.renameSync(LOG_DIR, PENDING_UPLOAD_LOG_DIR);
  fs.mkdirSync(LOG_DIR);

  fs.mkdirSync(PENDING_UPLOAD_INFO_DIR);
  fs.readdirSync(INFO_DIR).forEach(file => {
    fs.copyFileSync(
      `${INFO_DIR}/${file}`,
      `${PENDING_UPLOAD_INFO_DIR}/${file}`
    );
  });

  const form = new FormData();

  form.append("client_version", VERSION);
  form.append("client_id", ID);
  form.append("client_timestamp", timestamp);

  tar.create(
    { gzip: true
    , cwd: PENDING_UPLOAD_DIR
    , file: PENDING_UPLOAD_ARCHIVE_PATH
    },
    [ "." ],
    _ => {
      form.append("data_tarball",
        fs.createReadStream(PENDING_UPLOAD_ARCHIVE_PATH));

      form.submit(UPLOAD_OPTIONS, (err, res) => {
        if (err) {
          fs.readdirSync(`${PENDING_UPLOAD_LOG_DIR}`).forEach(file => {
            fs.renameSync(
              `${PENDING_UPLOAD_LOG_DIR}/${file}`,
              `${LOG_DIR}/${file}`
            );
          });
          logError(`Upload failed: ${err}`);
        } else {
          switch (res.statusCode) {
            case 200: // OK
              logInfo("Server accepted upload");
              res.resume();
              break;

            default: // Error
              res.setEncoding("utf8");
              let rawData = "";
              res.on("data", chunk => { rawData += chunk; });
              res.on("end", () => {
                logError(
                  `Server responded with status code `
                    + `${res.statusCode}: ${rawData}`
                );
              });
              break;
          }
        }

        fs.rmSync(PENDING_UPLOAD_DIR, { recursive: true, force: true });
        fs.rmSync(PENDING_UPLOAD_ARCHIVE_PATH);
      });
    }
  );
}

////////////////////////////////////////////////////////////////////////////////
// Language server protocol

async function listen(handler) {
  logInfo("Listening...");
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
    await handle(JSON.parse(content));
  }
}

async function handle(msg) {
  const timestamp = new Date().getTime();

  // Client requests

  switch (msg.method) {
    case "initialize":
      logInfo("Starting initialization...");

      const rootUri = msg.params.rootUri;
      if (!rootUri.startsWith(FILE_URI_PREFIX)) {
        logError(`Non-file URIs not supported: '${rootUri}'`);
        return;
      }
      ROOT_PATH = rootUri.substring(FILE_URI_PREFIX.length);

      ID = (await fsp.readFile(ID_PATH)).toString("utf8").trim();

			watchFiles();

			sendResponse(msg.id, {
        capabilities: {
          textDocumentSync: 1
        }
      });

      logInfo("Initialized!");

      await requestUploadIfNecessary(timestamp);

      break;

    case "textDocument/didChange":
      const uri = msg.params.textDocument.uri;
      if (!uri.startsWith(FILE_URI_PREFIX)) {
        logError(`Non-file URIs not supported: '${uri}'`);
        return;
      }

      const path = uri.substring(FILE_URI_PREFIX.length);
      if (!path.startsWith(ROOT_PATH)) {
        logError(
          `Text document path '${path}' does not begin with `
            + `root path '${ROOT_PATH}'`
        );
        return;
      }

      const contentChanges = msg.params.contentChanges;
      const lastContentChange = contentChanges[contentChanges.length - 1];
      if ("range" in lastContentChange) {
        logError(
          "Last content change is non-incremental: "
            + JSON.stringify(lastContentChange)
        );
        return;
      }

      const sourceFilename = path.substring(ROOT_PATH.length + 1);
      const sourceContent = lastContentChange.text;

      await store(timestamp, "buffer", sourceFilename, sourceContent);
      await requestUploadIfNecessary(timestamp);

      break;

    case "textDocument/didOpen": // No new info
    case "textDocument/didClose": // No new info
    case "textDocument/didSave": // Handled by file system watcher
      break;

    case "shutdown":
      sendResponse(msg.id, null);
      break;

    case "exit":
      process.exit(0);
      break;

    default:
      break;
  }

  // Client responses

  if (
    consentToUploadId !== null
      && msg.id === consentToUploadId
      && msg.result
      && indicatesConsent(msg.result.title)
  ) {
    upload();
  }
}

////////////////////////////////////////////////////////////////////////////////
// Updater

// TODO Also try to update the compiler wrapper
async function tryUpdate() {
  let latestVersion;
  try {
    const { code, content } = await request(LATEST_CLIENT_VERSION_OPTIONS);
    if (code !== 200) {
      logError(
        `Status ${code} returned when retrieving latest client version: `
          + JSON.stringify(content)
      );
      return;
    }
    latestVersion = content;
  } catch (err) {
    logError(`Error retrieving latest client version: ${err}`);
    return;
  }

  if (latestVersion === VERSION) {
    return;
  }

  logInfo(
    `New client version! Attempting to update from v${VERSION} to `
      + `v${latestVersion}...`
  );

  let currentClient;
  try {
    currentClient = await fsp.readFile(__filename);
  } catch (err) {
    logError(`Error retrieving current client: ${err}`);
    return;
  }

  let latestClient;
  try {
    latestClient = await request(LATEST_CLIENT_OPTIONS);
    const { code, content } = await request(LATEST_CLIENT_OPTIONS);
    if (code !== 200) {
      logError(
        `Status ${code} returned when retrieving latest client version: `
          + JSON.stringify(content)
      );
      return;
    }
    latestClient = content;
  } catch (err) {
    logError(`Error retrieving latest client: ${err}`);
    return;
  }

  try {
    await fsp.writeFile(
      `${VERSIONS_DIR}/edit-mirror-${VERSION}`,
      currentClient
    );
  } catch (err) {
    logError(`Error writing backup of current client: ${err}`);
    return;
  }

  log("TODO", "Auto-updating disabled for now.");
  return;

  try {
    await fsp.writeFile(__filename, latestClient);
    await fsp.chmod(__filename, 0o755);
    logInfo(`Successfully updated from from v${VERSION} to v${latestVersion}.`);
  } catch (err) {
    logError(`Error overwriting current client with latest client: ${err}`);
    logInfo(`Restoring previous version...`);
    try {
      fs.writeFileSync(__filename, currentClient);
      fs.chmodSync(__filename, 0o755);
    } catch (err) {
      logError(`Couldn't restore previous version: ${err}`);
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// Main

process.on('uncaughtException', function (error) {
  logError(error.stack.toString());
});

async function main() {
  logInfo("--- Starting new Edit Mirror session ---");
  await tryUpdate();
  await listen(handle);
}

main();
