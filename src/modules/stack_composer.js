const R = require('ramda');
const compose = require('koa-compose');

const pluginGenerator = require('./plugin_generator');
const middlewaresGenerator = require('./middlewares_generator');

const composeStackForApiRoute = R.curry((api, route) => {
  const pluginDefinitions = R.concat(
    R.propOr([], 'plugins', api),
    R.propOr([], 'plugins', route)
  );

  const plugins = R.map(pluginGenerator, pluginDefinitions);
  const middlewares = middlewaresGenerator(api, route);
  const stack = R.flatten(R.insert(1, plugins, middlewares));
  return compose(stack);
});

module.exports = composeStackForApiRoute;
