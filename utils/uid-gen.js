const crypto = require("crypto");

const timestamp = new Date().getTime();
const uuid = crypto.randomUUID();

console.log(`${timestamp}_${uuid}`);
