const R = require('ramda');
const pluginGenerator = require('./plugin_generator');
const middlewaresGenerator = require('./middlewares_generator');

const composeStackForApiRoute = (api, route) => {
  const pluginDefinitions = R.concat(
    R.propOr([], 'plugins', api),
    R.propOr([], 'plugins', route)
  );

  const plugins = R.map(pluginGenerator, pluginDefinitions);
  const middlewares = middlewaresGenerator(api, route);
  const stack = R.flatten(R.insert(1, plugins, middlewares));
  return stack;
};

module.exports = composeStackForApiRoute;
