const TIMESTAMP = new Date().getTime();

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const diff_match_patch = require("./diff_match_patch");
const dmp = new diff_match_patch.diff_match_patch();

const USAGE = "Usage: edit-mirror redact <phrase>";
const PLUGIN_DIR = "___edit-mirror___";

////////////////////////////////////////////////////////////////////////////////
// Redaction algorithm

// Note: We treat strings as sequences of UTF-16 code units

function assignIds(timeline) {
  timeline.idArrays = timeline.contents.map(c => new Array(c.length));

  let uid = 0;

  // "ci" in this function stands for "character index"
  for (let ci = 0; ci < timeline.idArrays[0].length; ci++) {
    timeline.idArrays[0][ci] = uid++;
  }

  for (let t = 1; t < timeline.length; t++) {
    const previousIdArray = timeline.idArrays[t - 1];
    const currentIdArray = timeline.idArrays[t];

    const diffs =
      dmp.diff_main(timeline.contents[t - 1], timeline.contents[t]);

    let ciPrev = 0;
    let ciCurr = 0;
    for (const diff of diffs) {
      if (diff[0] === diff_match_patch.DIFF_DELETE) {
        ciPrev += diff[1].length;
      } else if (diff[0] === diff_match_patch.DIFF_INSERT) {
        for (let k = 0; k < diff[1].length; k++) {
          currentIdArray[ciCurr++] = uid++;
        }
      } else { // diff[0] === DIFF_EQUAL
        for (let k = 0; k < diff[1].length; k++) {
          currentIdArray[ciCurr++] = previousIdArray[ciPrev++];
        }
      }
    }
  }
}

function computeBannedIds(password, timeline) {
  const bannedIds = new Set();
  for (let t = 0; t < timeline.length; t++) {
    const content = timeline.contents[t];
    const idArray = timeline.idArrays[t];

    let ci = content.indexOf(password);
    while (ci !== -1) {
      for (let offset = 0; offset < password.length; offset++) {
        bannedIds.add(idArray[ci + offset])
      }
      ci = content.indexOf(password, ci + 1);
    }
  }
  return bannedIds;
}

function redactBannedIds(bannedIds, timeline) {
  for (let t = 0; t < timeline.length; t++) {
    const content = timeline.contents[t];
    const idArray = timeline.idArrays[t];
    const newContent = [];
    let ci = 0;
    while (ci < content.length) {
      if (bannedIds.has(idArray[ci])) {
        newContent.push(`#####REDACTED:${TIMESTAMP}#####`);
        ci++;
        while (bannedIds.has(idArray[ci])) {
          ci++;
        }
      } else {
        newContent.push(content[ci++]);
      }
    }
    timeline.contents[t] = newContent.join("");
  }
  timeline.idArrays = null;
}

function redact(password, timeline) {
  assignIds(timeline);
  redactBannedIds(computeBannedIds(password, timeline), timeline);
}

////////////////////////////////////////////////////////////////////////////////
// File IO (TODO)

function readTimeline() {
  const filenames = ["123-Main.elm", "125-Main.elm", "126-Main.elm"];
  const contents = ["coficocontext", "cofcowordcontext", "codecodewordcontext"];
  return {
    "filenames": filenames,
    "contents": contents,
    "idArrays": null,
    "length": filenames.length
  };
}

function writeTimeline(timeline) {
  console.log(timeline);
}

////////////////////////////////////////////////////////////////////////////////
// Main

if (process.argv.length === 2) {
  console.log(USAGE);
  process.exit(0);
}

if (process.argv.length > 3) {
  console.error("Error: Too many arguments");
  console.error(USAGE);
  process.exit(1);
}

if (!fs.readdirSync(".").includes(PLUGIN_DIR)) {
  console.error(
    `Error: edit-mirror redact must be executed in a directory containing the `
      + `___edit-mirror___ directory`
  );
  process.exit(1);
}

process.chdir(PLUGIN_DIR);

// TODO: actually use readline, not argv
const password = process.argv[2];
const timeline = readTimeline();
redact(password, timeline);
writeTimeline(timeline);
