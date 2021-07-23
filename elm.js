// Actually this should probably be a bash script

const COMPILATION_LOG_PATH = "log/compilation_log/";

const { exec } = require("child_process");
const fsp = require("fs/promises");

const args = process.argv.slice(2);
const command = "elm " + args.join(" ");

const timestamp = new Date().getTime();

exec(command, async (err, stdout, stderr) => {
  console.log(stderr);
  await fsp.mkdir(COMPILATION_LOG_PATH, { recursive: true });
  if (err) {
    fsp.writeFile(
      COMPILATION_LOG_PATH + timestamp + "-err",
      err.code.toString()
    );
  }
  fsp.writeFile(COMPILATION_LOG_PATH + timestamp + "-stdout", stdout);
  fsp.writeFile(COMPILATION_LOG_PATH + timestamp + "-stderr", stderr);
});
