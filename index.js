/**
 * Returns a new Babel Transformer that uses the supplied schema to transform
 * template strings tagged with `Relay.QL` into an internal representation of
 * GraphQL queries.
 */

const fs = require('fs');

const log = (msg) => {
  console.log('[transform-relay-hot]', msg);
};

// file changes watcher
function watcherFn(schemaFilepath, watchInterval, reinitBabelRelayPlugin, prevMtime) {
  try {
    const stats = fs.statSync(schemaFilepath);
    if (stats) {
      if (!prevMtime) prevMtime = stats.mtime;
      if (stats.mtime.getTime() !== prevMtime.getTime()) {
        prevMtime = stats.mtime;
        reinitBabelRelayPlugin();
      }
    }
    setTimeout(
      () => {
        watcherFn(schemaFilepath, watchInterval, reinitBabelRelayPlugin, prevMtime);
      },
      watchInterval
    ).unref(); // fs.watch blocks babel from exit, so using `setTimeout` with `unref`
  } catch (e) {
    log(e);
  }
}


// babelRelayPlugin initializer
function initBabelRelayPlugin(pluginOptions, babel, ref) {
  const verbose = !!pluginOptions.verbose;
  const schemaFilepath = pluginOptions.schema || '';
  let schema;

  try {
    schema = fs.readFileSync(schemaFilepath, 'utf8');
  } catch (e) {
    schema = null;
    log('Cannot load GraphQL Schema from file \''
                 + schemaFilepath + '\': ' + e);
  }

  if (schema) {
    if (verbose) {
      log('GraphQL Schema loaded successfully from \'' + schemaFilepath + '\'');
    }
    ref.babelRelayPlugin = require('babel-plugin-relay')(babel);
  } else {
    // empty Plugin
    log('Relay.QL will not be transformed, cause `schema.data` is empty.');
    ref.babelRelayPlugin = {
      visitor: {
        Program: function () {},
        TaggedTemplateExpression: function () {},
      },
    };
  }
}

function initProxy(babel, state) {
  const ref = {};
  const pluginOptions = state.opts || {};

  if (pluginOptions.schemaJsonFilepath) {
    log(
      '[transform-relay-hot] Please rename `schemaJsonFilepath` option in .babelrc:'
      + '\n   {'
      + '\n     "plugins": ['
      + '\n       ["transform-relay-hot", {'
      + '\n 🛑 from:  "schemaJsonFilepath": "./pathToSchema.json",'
      + '\n 👌   to:  "schema": "./pathToSchema.json",'
      + '\n       }]'
      + '\n     ]'
      + '\n   }'
    );
    pluginOptions.schema = pluginOptions.schemaJsonFilepath;
  }

  if (!pluginOptions.schema || pluginOptions.schema === '') {
    log(
      '[transform-relay-hot] You should provide `schema` option in .babelrc:'
      + '\n   {'
      + '\n     "plugins": ['
      + '\n       ["transform-relay-hot", {'
      + '\n         "schema": "./pathToSchema.json",'
      + '\n         "watchInterval": 2000'
      + '\n       }]'
      + '\n     ]'
      + '\n   }'
    );
  }

  // HACK obtain/update babelRelayPlugin by reference
  initBabelRelayPlugin(pluginOptions, babel, ref);

  const watchInterval = pluginOptions && pluginOptions.watchInterval
    ? pluginOptions.watchInterval
    : 2000;
  if (watchInterval > 0 && pluginOptions.schema) {
    const reinitBabelRelayPlugin = () => {
      log('Re-init babel-plugin-relay');
      // decache all babel-plugin-relay modules
      Object.keys(require.cache).forEach((key) => {
        if (key.indexOf('babel-plugin-relay') > 0) {
          delete require.cache[key];
        }
      });
      Object.keys(module.constructor._pathCache).forEach((key) => {
        if (key.indexOf('babel-plugin-relay') > 0) {
          delete module.constructor._pathCache[key];
        }
      });
      initBabelRelayPlugin(pluginOptions, babel, ref);
    };
    watcherFn(pluginOptions.schema, watchInterval, reinitBabelRelayPlugin);
  }

  return ref;
}


// babel plugin proxy
module.exports = function (babel) {
  let ref;
  return {
    visitor: {
      /**
       * Extract the module name from `@providesModule`.
       */
      Program(path, state) {
        // HACK ONLY ONCE obtain plugin configs form .babelrc and init our proxy
        if (!ref) ref = initProxy(babel, state);

        const fn = ref.babelRelayPlugin.visitor.Program;
        if (fn) fn(path, state);
      },

      /**
       * Transform Relay.QL`...`.
       */
      TaggedTemplateExpression(path, state) {
        const fn = ref.babelRelayPlugin.visitor.TaggedTemplateExpression;
        if (fn) fn(path, state);
      },
    },
  };
};
