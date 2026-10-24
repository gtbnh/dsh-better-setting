import fs from "node:fs";

const file = process.argv[2];
const pattern = new RegExp(process.argv[3] ?? ".");
const s = fs.readFileSync(file, "utf8");
const rx = /const css\$?\d* = "((?:[^"\\]|\\.)*)";/g;
let m;
let found = 0;
while ((m = rx.exec(s)) !== null) {
  const css = JSON.parse('"' + m[1] + '"');
  const rules = css.split(/(?<=\})/).map((r) => r.trim()).filter(Boolean);
  for (const rule of rules) {
    if (pattern.test(rule)) {
      console.log(rule);
      found++;
    }
  }
}
if (found === 0) console.error("no rules matched");
