const fs = require("fs");
const path = require("path");

const parserPath = path.join(
  __dirname,
  "..",
  "node_modules",
  "@expo",
  "plist",
  "build",
  "parse.js",
);

const before = ".parseFromString(xml);";
const after = '.parseFromString(xml, "text/xml");';

if (!fs.existsSync(parserPath)) {
  console.warn("[patch-expo-plist] @expo/plist parser not found; skipping.");
  process.exit(0);
}

const source = fs.readFileSync(parserPath, "utf8");

if (source.includes(after)) {
  console.log("[patch-expo-plist] Parser already includes text/xml MIME type.");
  process.exit(0);
}

if (!source.includes(before)) {
  console.warn("[patch-expo-plist] Parser shape changed; no patch applied.");
  process.exit(0);
}

fs.writeFileSync(parserPath, source.replace(before, after));
console.log("[patch-expo-plist] Added text/xml MIME type for xmldom 0.9.");
