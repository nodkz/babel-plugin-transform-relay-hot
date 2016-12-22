# babel-plugin-transform-relay-hot

[![NPM version](https://img.shields.io/npm/v/babel-plugin-transform-relay-hot.svg)](https://www.npmjs.com/package/babel-plugin-transform-relay-hot)

[Babel 6](https://github.com/babel/babel) plugin for transforming `Relay.QL` tagged templates using json file with GraphQL schema. This plugin wraps standard [babelRelayPlugin](https://github.com/facebook/relay/tree/master/scripts/babel-relay-plugin). Each time the schema changes, the wrapper updates instance of `babelRelayPlugin` with new schema without completely restarting dev server.

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
      "schemaJsonFilepath": "./build/schema.graphql.json",
      "watchInterval": 2000
    }],
  ]
}
```

## Options

- **`schemaJsonFilepath`**
  - **Required**
  - Type: `String`
  - Path to graphql schema json file
- **`watchInterval`**
  - Type: `Number`
  - Default: 2000
  - Time interval in milliseconds to check `mtime` of json file. Internally used `setTimeout().unref()` cause `fs.watch` blocks babel from exit.
  - You may **disable watching** by setting `watchInterval: 0`.
- **`babelRelayPlugin options`**
  - Also you may define [additional options](https://facebook.github.io/relay/docs/guides-babel-plugin.html#additional-options) from `babelRelayPlugin`


## How to generate `graphql.schema.json` file

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

### [eslint-plugin-graphql](https://github.com/apollostack/eslint-plugin-graphql)

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

## License

MIT
