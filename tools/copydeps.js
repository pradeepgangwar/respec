#!/usr/bin/env node

"use strict";
const path = require("path");
const fs = require("fs").promises;
const depsPath = path.resolve("./js/deps/");
const srcDesMap = [
  [
    "./node_modules/handlebars/dist/handlebars.runtime.js",
    "./js/deps/handlebars.js",
  ],
  ["./node_modules/highlight.js/styles/github.css", "./assets/"],
  ["./node_modules/hyperhtml/umd.js", "./js/deps/hyperhtml.js"],
  ["./node_modules/jquery/dist/jquery.slim.js", "./js/deps/jquery.js"],
  ["./node_modules/marked/lib/marked.js", "./js/deps/"],
  ["./node_modules/requirejs/require.js", "./js/deps/"],
  ["./node_modules/text/text.js", "./js/deps/"],
  ["./node_modules/webidl2/dist/webidl2.js", "./js/deps/"],
  ["./node_modules/pluralize/pluralize.js", "./js/deps/"],
  ["./node_modules/idb/build/iife/with-async-ittr-min.js", "./js/deps/idb.js"],
].map(([source, dest]) => {
  return [path.resolve(source), path.resolve(dest)];
});

const deprecated = [
  [
    path.resolve("./node_modules/domReady/domReady.js"),
    "Use standard DOMContentLoaded and document.readyState instead.",
  ],
];

async function cp(source, dest) {
  const baseName = path.basename(source);
  const actualDestination = path.extname(dest)
    ? dest
    : path.resolve(dest, baseName);
  await fs.copyFile(source, actualDestination);
}

// Copy them again
async function copyDeps() {
  await fs.mkdir(depsPath);
  const copyPromises = srcDesMap.map(([source, dest]) => cp(source, dest));
  await Promise.all(copyPromises);
}

async function copyDeprecated() {
  const promises = deprecated.map(async ([dep, guide]) => {
    const basename = path.basename(dep, ".js");
    await cp(dep, `./js/deps/_${basename}.js`);

    const message = `The dependency \`deps/${basename}\` is deprecated. ${guide}`;
    const wrapper = `define(["deps/_${basename}"], dep => { console.warn("${message}"); return dep; });`;
    await fs.writeFile(path.resolve(`./js/deps/${basename}.js`), wrapper);
  });
  await Promise.all(promises);
}

// Delete dependent files
(async () => {
  try {
    await deleteFolder(depsPath);
    try {
      await fs.unlink(path.resolve("./js/core/css/github.css"));
    } catch {
      // File not found.
    }
    await copyDeps();
    await copyDeprecated();
  } catch (err) {
    console.error(err.stack);
    process.exit(1);
  }
})();

async function deleteFolder(path) {
  try {
    await fs.stat(path);
  } catch (err) {
    if (err.errno === -2) return; // doesn't exist
    throw err;
  }
  for (const file of await fs.readdir(path)) {
    const curPath = `${path}/${file}`;
    const stat = await fs.lstat(curPath);
    if (stat.isDirectory()) {
      await deleteFolder(curPath);
    } else {
      await fs.unlink(curPath);
    }
  }
  await fs.rmdir(path);
}
