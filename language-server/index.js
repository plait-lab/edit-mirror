////////////////////////////////////////////////////////////////////////////////
// Imports

const child_process = require("child_process");
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

const UPDATE_COMMAND = "edit-mirror update";

const UPLOAD_OPTIONS = {
  method: "POST",
  host: "localhost",
  port: 4040,
  path: "/upload"
}

const UPLOAD_REQUEST_THRESHOLD_HOURS = 0.01;

const REPO_DIR = path.normalize(__dirname + "/..");
const PLUGIN_DIR = "___edit-mirror___";

const ENABLED = fs.existsSync(PLUGIN_DIR);

const USER_INFO_PATH = REPO_DIR + "/user-info.json";

const LOG_DIR = PLUGIN_DIR + "/log";
const PENDING_UPLOAD_DIR = PLUGIN_DIR + "/pending-upload";
const METADATA_DIR = PLUGIN_DIR + "/metadata";

const PENDING_UPLOAD_ARCHIVE_PATH = PENDING_UPLOAD_DIR + ".tar.gz"
const PENDING_UPLOAD_LOG_DIR = PENDING_UPLOAD_DIR + "/log"
const PENDING_UPLOAD_METADATA_DIR = PENDING_UPLOAD_DIR + "/metadata"

const LAST_UPLOAD_REQUEST_PATH = METADATA_DIR + "/last-upload-request.txt";
const PLUGIN_LOG_PATH = METADATA_DIR + "/plugin-log.txt";
const PROJECT_ID_PATH = METADATA_DIR + "/project-id.txt";

const WATCHED_EXTENSION = ".elm";
const WATCHED_PATHS = ["**/*.elm", "elm.json"];
const IGNORED_PATHS = [PLUGIN_DIR + "/**", "elm-stuff/**"];

const FILE_URI_PREFIX = "file://";

////////////////////////////////////////////////////////////////////////////////
// Pseudo-constants (set once in init)

let ROOT_PATH = null;
let USER_INFO = null;
let PROJECT_ID = null;

////////////////////////////////////////////////////////////////////////////////
// Helpers

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
  const lastRequested =
    parseInt(await fsp.readFile(LAST_UPLOAD_REQUEST_PATH));

  const hoursElapsed =
    millisToHours(currentTimestamp - lastRequested);

  if (hoursElapsed < UPLOAD_REQUEST_THRESHOLD_HOURS) {
    return;
  }

  const visibleLogFiles =
    (await fsp.readdir(LOG_DIR)).filter(f => f[0] !== ".");

  if (visibleLogFiles.length === 0) {
    return;
  }

  logInfo("Requesting upload after " + hoursElapsed.toFixed(2) + " hours");
  await fsp.writeFile(LAST_UPLOAD_REQUEST_PATH, currentTimestamp.toString());
  requestUpload();
}

////////////////////////////////////////////////////////////////////////////////
// Storage manager

async function store(timestamp, kind, sourcePath, sourceContent) {
  const sourcePathEncoding = sourcePath.replaceAll("/", "$");
  const filename = `${LOG_DIR}/${timestamp}_${kind}_${sourcePathEncoding}`

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
    await store(timestamp, "watched-" + kind, path, content);
  });
}

async function watchFiles() {
  const watcher = chokidar.watch(WATCHED_PATHS, {
    ignored: IGNORED_PATHS,
    cwd: ".",
    atomic: 500 // ms ; TODO: check to make sure this is okay
  });

  watcher
    .on("add", watchHandler("add"))
    .on("change", watchHandler("change"))
    .on("unlink", watchHandler("unlink"));

  watcher.on("ready", async () => {
    const initHandler = watchHandler("init");
    for (const [dir, baseNames] of Object.entries(watcher.getWatched())) {
      for (const baseName of baseNames) {
        const path = dir === "." ? baseName : `${dir}/${baseName}`;
        await initHandler(path);
      }
    }
  });
}

////////////////////////////////////////////////////////////////////////////////
// Uploader

function revertUpload() {
  fs.readdirSync(`${PENDING_UPLOAD_LOG_DIR}`).forEach(file => {
    fs.renameSync(
      `${PENDING_UPLOAD_LOG_DIR}/${file}`,
      `${LOG_DIR}/${file}`
    );
  });
}

function upload() {
  const timestamp = new Date().getTime();

  fs.mkdirSync(PENDING_UPLOAD_DIR);

  fs.renameSync(LOG_DIR, PENDING_UPLOAD_LOG_DIR);
  fs.mkdirSync(LOG_DIR);

  fs.mkdirSync(PENDING_UPLOAD_METADATA_DIR);
  fs.readdirSync(METADATA_DIR).forEach(file => {
    fs.copyFileSync(
      `${METADATA_DIR}/${file}`,
      `${PENDING_UPLOAD_METADATA_DIR}/${file}`
    );
  });

  const form = new FormData();

  logInfo(VERSION);
  logInfo(timestamp);
  logInfo(JSON.stringify(USER_INFO));
  logInfo(PROJECT_ID);
  form.append("client_version", VERSION);
  form.append("client_timestamp", timestamp);
  form.append("user_info", JSON.stringify(USER_INFO));
  form.append("project_id", PROJECT_ID);

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
          revertUpload();
          logError(`Upload failed: ${err}`);
        } else {
          switch (res.statusCode) {
            case 200: // OK
              logInfo("Server accepted upload");
              res.resume();
              break;

            default: // Error
              revertUpload();
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

async function listen(handle) {
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

    await handle(JSON.parse(content));
  }
}

async function passiveHandle(msg) {
  switch (msg.method) {
    case "initialize":
			sendResponse(msg.id, {
        capabilities: {}
      });
      break;

    case "shutdown":
      sendResponse(msg.id, null);
      break;

    case "exit":
      process.exit(0);
      break;
  }
}

async function initialize(msg, timestamp) {
  logInfo("Starting initialization...");

  const rootUri = msg.params.rootUri;
  if (!rootUri.startsWith(FILE_URI_PREFIX)) {
    logError(`Non-file URIs not supported: '${rootUri}'`);
    return;
  }
  ROOT_PATH = rootUri.substring(FILE_URI_PREFIX.length);

  USER_INFO = JSON.parse(await fsp.readFile(USER_INFO_PATH));
  PROJECT_ID =
    (await fsp.readFile(PROJECT_ID_PATH, { encoding: "utf8" }))
    .trim();

  await watchFiles();

  sendResponse(msg.id, {
    capabilities: {
      textDocumentSync: 1
    }
  });

  logInfo("Initialized!");

  await requestUploadIfNecessary(timestamp);
}

async function textDocumentDidChange(msg, timestamp) {
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
}

async function activeHandle(msg) {
  const timestamp = new Date().getTime();

  // Client responses

  if (
    consentToUploadId !== null
      && msg.id === consentToUploadId
      && msg.result
      && indicatesConsent(msg.result.title)
  ) {
    upload();
    return;
  }

  // Client requests

  switch (msg.method) {
    case "initialize":
      await initialize(msg, timestamp);
      return;

    case "textDocument/didChange":
      await textDocumentDidChange(msg, timestamp);
      return;

    case "shutdown":
      sendResponse(msg.id, null);
      return;

    case "exit":
      process.exit(0);
      return;

    case "textDocument/didOpen": // No new info
    case "textDocument/didClose": // No new info
    case "textDocument/didSave": // Handled by file system watcher
      return;
  }
}

////////////////////////////////////////////////////////////////////////////////
// Updater

function tryUpdate() {
  child_process.exec(UPDATE_COMMAND, (error, stdout, stderr) => {
    logInfo("Begin update exec() output");
    if (error) {
      logError(`  exec() error while updating: ${error}`);
    }
    logInfo(`  stdout: ${stdout.trim()}`);
    if (stderr) {
      logInfo(`  stderr: ${stderr.trim()}`);
    }
    logInfo("End update exec() output");
  });
}

////////////////////////////////////////////////////////////////////////////////
// Main

process.on('uncaughtException', error => {
  logError(error.stack.toString());
});

async function main() {
  if (ENABLED) {
    logInfo("--- Starting new Edit Mirror session ---");
    tryUpdate();
    await listen(activeHandle);
  } else {
    await listen(passiveHandle);
  }
}

main();
