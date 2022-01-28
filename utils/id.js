const fs = require("fs");
const path = require("path");

const userInfo =
  JSON.parse(
    fs.readFileSync(
      path.normalize(__dirname + "/../user-info.json"),
      { encoding: "utf8" }
    )
  );

console.log(userInfo.id);
