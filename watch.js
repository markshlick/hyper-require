const repl = require("repl");
const { relative } = require("path");
const chokidar = require("chokidar");
const appRoot = require("app-root-path");
const hyperRequire = require("./index");

const watchPath = process.env.HYPER_REQUIRE_WATCH_PATH || appRoot.path;
const ignorePath =
  process.env.HYPER_REQUIRE_WATCH_IGNORE || "**/node_modules/**";

/**
 * @see https://stackoverflow.com/questions/28683743/adjust-node-repl-to-not-clobber-prompt-on-async-callback
 * @param {repl.REPLServer} replServer
 * @param {string} msg
 */
const replLog = (replServer, msg) => {
  // @ts-ignore
  const promptOffset = replServer._prompt.length + replServer.line.length;
  replServer.outputStream.write("\033[2K\033[1G"); // Erase to beginning of line, and reposition cursor at beginning of line
  replServer.outputStream.write(msg + "\n");
  // @ts-ignore
  replServer.outputStream.write("" + replServer._prompt + replServer.line); // Redraw existing line
  replServer.outputStream.write("\033[" + (promptOffset + 1) + "G"); // Move the cursor to where it was
};

module.exports = function watch(opts = {}) {
  const watcher = chokidar.watch(opts.path || watchPath, {
    ignored: opts.ignore || ignorePath,
  });

  watcher.on("change", (path) => {
    const msg = `🔥 [HyperRequire] Patching ${relative(watchPath, path)}`;
    if (require.cache[path] && path !== __filename) {
      // @ts-ignore
      const activeRepl = repl.repl;
      if (activeRepl) {
        replLog(activeRepl, msg);
      } else {
        console.log(msg);
      }
      hyperRequire(path);
    }
  });

  const dispose = function () {
    return watcher.removeAllListeners();
  };

  return { dispose };
};
