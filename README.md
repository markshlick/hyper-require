# HyperRequire

HyperRequire is an interactive development tool designed to speed up your workflow. It's like a souped-up [React Hot Loader](https://vimeo.com/100010922) for the backend. 🔥 Just save a file and HyperRequire will auto-magically ✨ patch the new code into your running program.

Unlike typical HMR, HyperRequire auto-magically updates all of your exported functions, class prototypes and objects in-place.

HyperRequire watches all your imported modules and can patch almost any type at runtime, including:

- Functions
- Class prototypes and constructors
- Objects and arrays
- Any any property on `module.exports`

_Note:_ HyperRequire doesn't play well with ESM/MJS yet.

## Install it

```sh
yarn add -D hyper-require # or npm install -D hyper-require
```

## Use it

### Start a REPL

```sh
node -r hyper-require/register
# or
babel-node -r hyper-require/register
# or
ts-node -r hyper-require/register
# or even
ts-node -r hyper-require/register -r tsconfig-paths/register
```

### Use it in Node:

```js
// 1. watch and auto-patch all modules
require("hyper-require/register");

// ... or 2. same as #1, but you control start/stop
const hyperRequireWatch = require("hyper-require/watch");
const watcher = hyperRequireWatch();
watcher.dispose();

// ... or  3. control module patching
const hyperRequire = require("hyper-require");
let mod = require("./a-module");
hyperRequire("./a-module");
```

## API

### HyperRequire (`hyper-require`)

Provides a function to reload and patch a specified module

```js
const hyperRequire = require("hyper-require");
hyperRequire("./a-module");
```

### Register (`hyper-require/register`)

Requiring this file will immediately begin watching files for changes.

### Watch (`hyper-require/watch`)

Watch accepts an object specifying `path` and `ignore` path globs [anymatch](https://github.com/micromatch/anymatch).

```js
const watcher = require("hyper-require/watch")({
  path: "./dir",
  ignore: "./other",
});
```

If `path` is unspecified, HyperRequire will fall back to `HYPER_REQUIRE_WATCH_PATH`, then the app root path.

If `path` is unspecified, HyperRequire will fall back to `HYPER_REQUIRE_IGNORE_PATH`, then the glob `**/node_modules**`.

### Global callback (`module.onHyperRequire`)

HyperRequire checks for a `onHyperRequire` function on every module and will call it evey time a module is reloaded. `module.onHyperRequire` will be called with two arguments: the id of the reloaded module, and the value of it's `module.exports`.

## Limitations & gotchas

### Side-effects during module loading

Please be mindful that HyperRequire will re-evaluate the module's underlying file, which could cause problems with async behavior and "hot" handles like DB connections.

To gracefully wind down these types of resources, HyperRequire will call `module.dispose` on an old module after a new one is successfully loaded.

```js
let i = 0;

const timer = setInterval(() => console.log(i++), 1000);

module.dispose = () => clearInterval(timer);
```

### Destructuring primitives

If you're exporting and modifying primitives (numbers, strings, booleans) and want those changes to propagate, avoid destructuring the returned object from `require`.

```js
// # num.js
module.exports = { num: 1 };

// # main.js

// ## ex 1 - with destructuring assignment
const { num } = require("./mod");
// programmer updates num.js:num to 2
hyperRequire("./mod");
console.log(num); // it's still 1 :(

// ## ex 2 - with reference to module.exports
const mod = require("./mod");
// programmer updates num.js:num to 2
hyperRequire("./mod");
console.log(num); // it's 2!

// ## ex 3 - with controlled updates
let { num } = require("./mod");
// programmer updates num.js:num to 2
const { num: newNum } = hyperRequire("./mod"); // `hyperRequire` returns the fresh module.exports
num = newNum;
console.log(num); // it's 2!
```

### Function as `module.exports` 🏗

This does not work yet. WIP.

```js
module.exports = function () {
  /*...*/
};
```

### Persisted values between reloads

WIP. Right now, all values in module.exports are overwritten on reload. In the future, there will be an API (e.g. `const myVal = module.persisted.myVal;`) to enable retaining values between reloads.

### Bubbling module updates (like `module.hot.accept`)

This is WIP.
