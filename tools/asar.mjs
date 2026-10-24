#!/usr/bin/env node
// Minimal ASAR reader: list / grep / extract entries without the electron runtime.
// Usage:
//   node tools/asar.mjs list  <asar> [filterSubstring]
//   node tools/asar.mjs grep  <asar> <needle> [pathFilterSubstring]
//   node tools/asar.mjs extract <asar> <entryPath> <destPath>
import fs from "node:fs";
import path from "node:path";

function readHeader(file) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(16);
  fs.readSync(fd, head, 0, 16, 0);
  const headerSize = head.readUInt32LE(4);
  const jsonLen = head.readUInt32LE(12);
  const json = Buffer.alloc(jsonLen);
  fs.readSync(fd, json, 0, jsonLen, 16);
  return { fd, json: JSON.parse(json.toString("utf8")), dataOffset: 8 + headerSize };
}

function walk(node, prefix, out) {
  for (const [name, entry] of Object.entries(node.files || {})) {
    const full = prefix === "" ? name : `${prefix}/${name}`;
    if (entry.files) walk(entry, full, out);
    else out.push({ path: full, size: entry.size, offset: entry.offset, unpacked: entry.unpacked === true });
  }
}

const [mode, asar, a, b] = process.argv.slice(2);
if (!mode || !asar) {
  console.error("usage: list|grep|extract <asar> ...");
  process.exit(2);
}
const { fd, json, dataOffset } = readHeader(asar);
const entries = [];
walk(json, "", entries);

if (mode === "list") {
  const filter = a;
  for (const e of entries) {
    if (!filter || e.path.includes(filter)) console.log(`${e.unpacked ? "U" : " "} ${e.size}\t${e.path}`);
  }
} else if (mode === "grep") {
  const needle = a;
  const filter = b;
  const needleLower = needle.toLowerCase();
  let hits = 0;
  for (const e of entries) {
    if (filter && !e.path.includes(filter)) continue;
    if (e.unpacked || e.size === 0) continue;
    if (e.size > 40 * 1024 * 1024) continue;
    const buf = Buffer.alloc(e.size);
    fs.readSync(fd, buf, 0, e.size, BigInt(dataOffset) + BigInt(e.offset));
    const text = buf.toString("latin1");
    const idx = text.toLowerCase().indexOf(needleLower);
    if (idx === -1) continue;
    hits++;
    const start = Math.max(0, idx - 200);
    const end = Math.min(text.length, idx + needle.length + 400);
    console.log(`=== ${e.path} (size ${e.size}) @${idx}`);
    console.log(text.slice(start, end).replace(/\s+/g, " "));
    if (hits >= 40) { console.log("...stopped after 40 files"); break; }
  }
  console.error(`matched ${hits} file(s)`);
} else if (mode === "extract") {
  const entryPath = a;
  const dest = b;
  const entry = entries.find((e) => e.path === entryPath);
  if (!entry) { console.error("entry not found:", entryPath); process.exit(1); }
  const buf = Buffer.alloc(entry.size);
  fs.readSync(fd, buf, 0, entry.size, BigInt(dataOffset) + BigInt(entry.offset));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`extracted ${entry.size} bytes -> ${dest}`);
} else {
  console.error("unknown mode", mode);
  process.exit(2);
}
