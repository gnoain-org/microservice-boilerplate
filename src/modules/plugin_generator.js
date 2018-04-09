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
    request: R.pick(['body', 'headers', 'query'], ctx.upstream.request),
    response: R.pick(['body', 'headers', 'status'], ctx.response)
  };

  const requestCondition = jsonLogicChecker.validateLogic(
    R.prop('request', condition),
    source.request
  );
  R.when(
    R.and(R.is(Function, plugin.requestPhase), requestCondition),
    await plugin.requestPhase(ctx)
  );

  await next();

  const responseCondition = jsonLogicChecker.validateLogic(
    R.prop('response', condition),
    source.response
  );
  R.when(
    R.and(
      R.is(Function, plugin.responsePhase),
      R.and(requestCondition, responseCondition)
    ),
    await plugin.responsePhase(ctx)
  );
});

module.exports = generatePlugin;
