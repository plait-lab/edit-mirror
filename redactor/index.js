const TIMESTAMP = new Date().getTime();

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const diff_match_patch = require("./diff_match_patch");
const dmp = new diff_match_patch.diff_match_patch();

const USAGE = "Usage: edit-mirror redact";
const PLUGIN_DIR = "___edit-mirror___";

////////////////////////////////////////////////////////////////////////////////
// Redaction algorithm

// Note: We treat strings as sequences of UTF-16 code units

// Convention:
//   - "t" as a loop variable corresponds to a timestep in the timeline,
//   - "ci" as a loop variable corresponds to a character index within a
//     timestep

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

if (process.argv.length !== 2) {
  console.error("Error: Incorrect number of arguments");
  console.log(USAGE);
  process.exit(1);
}

try {
  process.chdir(PLUGIN_DIR);
} catch (_) {
  console.error(
    `Error: edit-mirror redact must be executed in a directory containing the `
      + `___edit-mirror___ directory`
  );
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function quitEarly() {
  console.log("Exiting without redacting anything");
  rl.close();
  process.exit(0);
}

rl.question("Phrase to redact (blank to cancel): ", password => {
  if (!password) {
    quitEarly();
  }

  rl.question(
    "Are you sure you want to redact that phrase? (y/N) ",
    confirmation => {
      if (confirmation.toLowerCase() !== "y") {
        quitEarly();
      }

      const timeline = readTimeline();
      redact(password, timeline);
      writeTimeline(timeline);
      rl.close();
    }
  );
});
