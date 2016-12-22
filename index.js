'use strict';

/**
 * Returns a new Babel Transformer that uses the supplied schema to transform
 * template strings tagged with `Relay.QL` into an internal representation of
 * GraphQL queries.
 */

var getBabelRelayPlugin = require('babel-relay-plugin');
var fs = require('fs');
var path = require('path');


// file changes watcher
function watcherFn(schemaJsonFilepath, watchInterval, reinitBabelRelayPlugin, prevMtime) {
  try {
    var stats = fs.statSync(schemaJsonFilepath);
    if (stats) {
      if (!prevMtime) prevMtime = stats.mtime;
      if (stats.mtime.getTime() !== prevMtime.getTime()) {
        prevMtime = stats.mtime;
        reinitBabelRelayPlugin();
      }
    }
    setTimeout(
      function () {
        watcherFn(schemaJsonFilepath, watchInterval, reinitBabelRelayPlugin, prevMtime);
      },
      watchInterval
    ).unref(); // fs.watch blocks babel from exit, so using `setTimeout` with `unref`
  } catch (e) {
    console.warn('[transform-relay-hot] ' + e);
  }
};


// babelRelayPlugin initializer
function initBabelRelayPlugin(pluginOptions, babel, ref) {
  var schemaJsonFilepath = pluginOptions.schemaJsonFilepath || '';
  var schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaJsonFilepath, 'utf8'));
  } catch (e) {
    schema = null;
    console.warn('[transform-relay-hot] Cannot load GraphQL Schema from file \''
                 + schemaJsonFilepath + '\': ' + e);
  }

  if (schema && schema.data) {
    console.log('[transform-relay-hot] GraphQL Schema loaded successfully from \''
                 + schemaJsonFilepath + '\'')
    ref.babelRelayPlugin = getBabelRelayPlugin(schema.data, pluginOptions)(babel);
  } else {
    // empty Plugin
    console.warn('[transform-relay-hot] Relay.QL will not be transformed, cause `schema.data` is empty.')
    ref.babelRelayPlugin = {
      visitor: {
        Program: function () {},
        TaggedTemplateExpression: function () {},
      }
    };
  }

  var watchInterval = pluginOptions && pluginOptions.watchInterval
    ? pluginOptions.watchInterval
    : 2000;
  if (watchInterval > 0 && schemaJsonFilepath !== '') {
    function reinitBabelRelayPlugin() {
      initBabelRelayPlugin(pluginOptions, babel, ref);
    }
    watcherFn(schemaJsonFilepath, watchInterval, reinitBabelRelayPlugin);
  }
}


// babel plugin proxy
module.exports = function(babel) {
  var ref;
  return {
    visitor: {
      /**
       * Extract the module name from `@providesModule`.
       */
      Program(path, state) {
        // HACK ONLY ONCE obtain plugin configs form .babelrc and init BabelRelayPlugin
        if (!ref) {
          ref = {};
          var pluginOptions = state.opts || {};
          if (!pluginOptions.schemaJsonFilepath || pluginOptions.schemaJsonFilepath === '') {
            console.warn(
              '[transform-relay-hot] You should provide `schemaJsonFilepath` option in .babelrc:'
              + '\n   {'
              + '\n     "plugins": ['
              + '\n       ["transform-relay-hot", {'
              + '\n         "schemaJsonFilepath": "./pathToSchema.json",'
              + '\n         "watchInterval": 2000'
              + '\n       }]'
              + '\n     ]'
              + '\n   }'
           );
          }
          initBabelRelayPlugin(pluginOptions, babel, ref); // HACK obtain/update babelRelayPlugin by reference
        }

        ref.babelRelayPlugin.visitor.Program(path, state);
      },

      /**
       * Transform Relay.QL`...`.
       */
      TaggedTemplateExpression(path, state) {
        ref.babelRelayPlugin.visitor.TaggedTemplateExpression(path, state);
      },
    },
  };
};
