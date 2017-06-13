# babel-plugin-transform-relay-hot

[![NPM version](https://img.shields.io/npm/v/babel-plugin-transform-relay-hot.svg)](https://www.npmjs.com/package/babel-plugin-transform-relay-hot)
[![npm](https://img.shields.io/npm/dt/babel-plugin-transform-relay-hot.svg)](http://www.npmtrends.com/babel-plugin-transform-relay-hot)

[Babel 6](https://github.com/babel/babel) plugin for transforming `graphql` literals  and `Relay.QL` tagged templates (when `"compat": true`). It uses json file with GraphQL schema. This plugin wraps  [babel-plugin-relay](https://facebook.github.io/relay/docs/babel-plugin-relay.html). Each time the schema file changes, the wrapper updates instance of `babel-plugin-relay` with new schema without completely restarting dev server.

## Install

```
yarn add babel-plugin-transform-relay-hot --dev
```
or
```
npm install babel-plugin-transform-relay-hot --save-dev
```

## Usage with .babelrc

```js
{
  "plugins": [
    ["transform-relay-hot", {
      "schema": "./build/schema.graphql.json",
      "watchInterval": 2000,
      "verbose": true
    }],
  ]
}
```

## Options

- **`schema`**
  - **Required**
  - Type: `String`
  - Path to graphql schema json file
- **`watchInterval`**
  - Type: `Number`
  - Default: 2000
  - Time interval in milliseconds to check `mtime` of json file. Internally used `setTimeout().unref()` cause `fs.watch` blocks babel from exit.
  - You may **disable watching** by setting `watchInterval: 0`.
- **`verbose`**
  - Type: `Boolean`
  - Default: false
  - Log to console when schema reloaded.
- Also you may define [additional options](https://facebook.github.io/relay/docs/babel-plugin-relay.html) from **`babel-plugin-relay`**

Use `"compat": true` option for Relay Classic.


## How to generate `graphql.schema.json` file
You may use [webpack-plugin-graphql-schema-hot](https://github.com/nodkz/webpack-plugin-graphql-schema-hot) or do it manually:
```js
import fs from 'fs';
import path from 'path';
import { graphql, introspectionQuery } from 'graphql';
import Schema from './schema';

export default async function generateSchema() {
  const result = await (graphql(Schema, introspectionQuery));
  fs.writeFileSync(
    path.join(__dirname, './build/schema.graphql.json'),
    JSON.stringify(result, null, 2)
  );
}
```

## Recommended modules

### 🔥 [webpack-plugin-graphql-schema-hot](https://github.com/nodkz/webpack-plugin-graphql-schema-hot)

Webpack plugin which tracks changes in your GraphQL Schema files and generates schema introspection in `json` and `txt` formats. `webpack-plugin-graphql-schema-hot` can freeze Webpack, while this plugin catch changes from `json` file. For this you need set `waitOnStart` and `waitOnRebuild` options (in Webpack plugin) equal to `watchInterval` (from this babel plugin):
```js
import path from 'path';
import WebpackPluginGraphqlSchemaHot from 'webpack-plugin-graphql-schema-hot';

const config = {
  // ...
  plugins: [
    new WebpackPluginGraphqlSchemaHot({
      schemaPath: path.resolve(__dirname, '../schema/index.js'),
      output: {
        // json file path should be equal to `schemaJsonFilepath`
        json: path.resolve(__dirname, '../build/schema.graphql.json'),
        txt: path.resolve(__dirname, '../build/schema.graphql.txt'),
      },
      runOnStart: true,
      waitOnStart: 2000, // <----- value from `watchInterval`
      waitOnRebuild: 2000, // <----- value from `watchInterval`
      verbose: true,
    }),
  ]
}
```

### 🔥 [eslint-plugin-graphql](https://github.com/apollostack/eslint-plugin-graphql)

For `eslint` checks of `Relay.QL` tagged templates you may use `eslint-plugin-graphql`. It also tracks changes of graphql schema json file with following config:
```js
// In a file called .eslintrc.js
const path = require('path');

module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      env: 'relay',
      schemaJsonFilepath: path.resolve(__dirname, './build/schema.graphql.json'),
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### 🔥 [js-graphql-intellij-plugin](https://github.com/jimkyndemeyer/js-graphql-intellij-plugin)

GraphQL language support for IntelliJ IDEA and WebStorm, including Relay.QL tagged templates in JavaScript and TypeScript.

### 🔥 [webpack-plugin-relay-touch-dependents](https://github.com/jrhicks/webpack-plugin-relay-touch-dependents)

Trigger webpack rebuilds after your GraphQL Schema has been updated and saved to JSON..

## License

MIT
