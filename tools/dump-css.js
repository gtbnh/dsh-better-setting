// Dump a CSS string constant (css$N = "...") from a bundled client module to a file.
const fs = require("node:fs");
const file = process.argv[2];
const out = process.argv[3];
const text = fs.readFileSync(file, "utf8");
const m = text.match(/const css\$?\d*\s*=\s*"((?:[^"\\]|\\.)*)"/);
if (!m) { console.error("no css constant found"); process.exit(1); }
const css = JSON.parse('"' + m[1] + '"');
fs.writeFileSync(out, css);
console.log("bytes:", css.length, "->", out);
