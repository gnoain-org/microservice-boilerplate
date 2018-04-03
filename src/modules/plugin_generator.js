const R = require('ramda');
const jsonLogicChecker = require('../util/json_logic_checker');

const generatePlugin = pluginDefinition => {
  const plugin = R.converge(R.call, [
    R.pipe(R.propOr('', 'name'), R.concat('../plugins/'), require),
    R.propOr({}, 'config')
  ])(pluginDefinition);
  return runPlugin(plugin, pluginDefinition.condition);
};

const runPlugin = R.curry(async (plugin, condition, ctx, next) => {
  const source = {
    request: R.pick(['body', 'headers', 'query'], ctx.request),
    response: R.pick(['body', 'headers', 'status'], ctx.response)
  };
  if (jsonLogicChecker.validateLogic(condition, source)) {
    await plugin(ctx, next);
  } else {
    await next();
  }
});

module.exports = generatePlugin;
