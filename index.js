const Module = require("module");

const expsMeta = new Map();
const onHyperRequireHandlers = new Map();

// TODO: expose an option
function shouldReloadPath(filePath) {
  return !filePath.includes("node_modules");
}

function deregisterHandler(mod) {
  onHyperRequireHandlers.delete(mod.id);
}

function registerHandler(mod) {
  if (mod && typeof mod.onHyperRequire === "function") {
    onHyperRequireHandlers.set(mod.id, mod.onHyperRequire);
  }
}

function patchLoader() {
  for (const key in require.cache) {
    const mod = require.cache[key];
    const modExps = mod.exports;

    if (shouldReloadPath(key)) {
      registerModule(modExps);
      registerHandler(mod);
    }
  }

  // @ts-ignore
  const Module_load = Module._load;

  // @ts-ignore
  Module._load = (request, parent, isMain) => {
    const modExps = Module_load(request, parent, isMain);

    // @ts-ignore
    const filePath = Module._resolveFilename(request, parent, isMain);
    if (modExps && shouldReloadPath(filePath) && !expsMeta.has(modExps)) {
      registerModule(modExps);
    }

    const mod = require.cache[filePath];
    registerHandler(mod);

    return modExps;
  };
}

const defineExportProxy = (expsObj, defs, expName) => {
  expsMeta.get(expsObj).bindings[expName] = defs[expName];
  expsObj[expName] = new Proxy(defs[expName], {
    apply: function (_, thisArg, argumentsList) {
      const target = expsMeta.get(expsObj).bindings[expName];
      return target.apply(thisArg, argumentsList);
    },
    construct: function (_, args) {
      const target = expsMeta.get(expsObj).bindings[expName];
      return new target(...args);
    },
  });
};

function createExpsMetaEntry() {
  return { bindings: {} };
}

function registerModule(expsObj) {
  expsMeta.set(expsObj, createExpsMetaEntry());
  for (const expName in expsObj) {
    const binding = expsObj[expName];
    if (typeof binding === "function") {
      defineExportProxy(expsObj, expsObj, expName);
    }
  }
}

function patchModule(expsObj, newExps) {
  for (const expName in newExps) {
    if (typeof newExps[expName] === "function") {
      if (!expsObj[expName]) {
        defineExportProxy(expsObj, newExps, expName);
      } else {
        expsMeta.get(expsObj).bindings[expName] = newExps[expName];
        if (expsObj[expName].prototype && newExps[expName].prototype) {
          for (const protoPropName in Object.getOwnPropertyDescriptors(
            newExps[expName].prototype
          )) {
            expsObj[expName].prototype[protoPropName] =
              newExps[expName].prototype[protoPropName];
          }
        }
      }
    } else if (
      typeof newExps[expName] === "object" &&
      expsObj[expName] &&
      !(newExps[expName] instanceof Date)
    ) {
      for (const protoPropName in Object.getOwnPropertyDescriptors(
        newExps[expName]
      )) {
        expsObj[expName][protoPropName] = newExps[expName][protoPropName];
      }
    } else {
      expsObj[expName] = newExps[expName];
    }
  }
}

function hyperRequire(id) {
  const resolvedId = require.resolve(id);
  const oldModule = require.cache[resolvedId];

  deregisterHandler(oldModule);
  delete require.cache[resolvedId];

  try {
    const exp = require(id);
    const newModule = require.cache[resolvedId];

    registerHandler(newModule);

    patchModule(oldModule.exports, exp);
    newModule.exports = oldModule.exports;
    newModule.parent = oldModule.parent;
    newModule.children = oldModule.children;

    // @ts-ignore
    if (oldModule.dispose) {
      // @ts-ignore
      oldModule.dispose(newModule);
    }

    onHyperRequireHandlers.forEach((handler) => {
      setImmediate(() => {
        handler(resolvedId, exp);
      });
    });

    return oldModule.exports;
  } catch (error) {
    console.error(error);
    require.cache[resolvedId] = oldModule;
    return oldModule.exports;
  }
}

patchLoader();

module.exports = hyperRequire;
