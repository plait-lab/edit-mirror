// we treat strings as sequences of UTF-16 code units

const diff_match_patch = require("./diff_match_patch");
const dmp = new diff_match_patch.diff_match_patch();

const timestamp = new Date().getTime();

function makeEmptyIds(s) {
  return new Array(s.length);
  return s.split("").map(_ => null);
}

let uid = 0;

const evolution = ["coficocontext", "cofcowordcontext", "codecodewordcontext"];
// const evolution = ["coword", "codecodeword"];
const ids = evolution.map(entry => makeEmptyIds(entry));

for (let i = 0; i < ids[0].length; i++) {
  ids[0][i] = uid++;
}

for (let i = 1; i < ids.length; i++) {
  const previous = ids[i - 1];
  const current = ids[i];
  const diffs = dmp.diff_main(evolution[i - 1], evolution[i]);
  let pj = 0;
  let cj = 0;
  for (const diff of diffs) {
    if (diff[0] === diff_match_patch.DIFF_DELETE) {
      pj += diff[1].length;
    } else if (diff[0] === diff_match_patch.DIFF_INSERT) {
      for (let k = 0; k < diff[1].length; k++) {
        current[cj++] = uid++;
      }
    } else { // diff[0] === DIFF_EQUAL
      for (let k = 0; k < diff[1].length; k++) {
        current[cj++] = previous[pj++];
      }
    }
  }
}

function merged(e, i) {
  const ar = Array(e.length);
  for (let x = 0; x < e.length; x++) {
    ar[x] = [e[x], i[x]];
  }
  return ar;
}


const banned = new Set();
function populate(password, fileContents, charIds) {
  let k = fileContents.indexOf(password);
  while (k !== -1) {
    for (let i = k; i < k + password.length; i++) {
      banned.add(charIds[i])
    }
    k = fileContents.indexOf(password, k + 1);
  }
}

String.prototype.replaceAt = function(index, replacement) {
  return this.substr(0, index) + replacement + this.substr(index + 1);
}

for (let x = 0; x < evolution.length; x++) {
  populate('codeword', evolution[x], ids[x]);
}

console.log(`before (password = "codeword"):`);

for (const e of evolution) {
  console.log("  " + e);
}

console.log("\nafter:");

const output = Array.from(evolution.length);
for (let i = 0; i < evolution.length; i++) {
  output[i] = [];
  let j = 0;
  while (j < evolution[i].length) {
    if (banned.has(ids[i][j])) {
      output[i].push(`#####REDACTED:${timestamp}#####`);
      j++;
      while (banned.has(ids[i][j])) {
        j++;
      }
    } else {
      output[i].push(evolution[i][j++]);
    }
  }
  output[i] = output[i].join('');
  console.log("  " + output[i]);
}
