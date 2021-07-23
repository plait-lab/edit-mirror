const FILE_LOG_PATH = "log/file_log/";

const path = require("path");
const fsp = require("fs/promises");
const chokidar = require("chokidar");

async function store(timestamp, kind, sourceFilename, sourceContent) {
  const logBasePath = FILE_LOG_PATH + sourceFilename;
  const logFilename = logBasePath + "/" + timestamp + "-" + kind;

  await fsp.mkdir(logBasePath, { recursive: true });
  await fsp.writeFile(logFilename, sourceContent);
}

function watchHandler(kind) {
  return (async path => {
    console.log(path);
    const content = await fsp.readFile(path);
    store(new Date().getTime(), "watch-" + kind, path.slice(3), content);
  });
}

chokidar.watch("../**/*.elm", { ignored: "../" + path.basename(process.cwd()) })
  .on("add", watchHandler("add"))
  .on("change", watchHandler("change"))
  .on("unlink", watchHandler("unlink"));
