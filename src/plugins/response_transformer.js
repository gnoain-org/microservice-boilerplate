const jsonPatch = require('fast-json-patch');
const R = require('ramda');

const jsonLogicChecker = require('../util/json_logic_checker');

const applyTransformation = (
  ctx,
  { source, condition, operations, adaption: adaption_name }
) => {
  const conditionApplies = jsonLogicChecker.validateLogic(
    condition,
    R.path(['response', source], ctx)
  );
  if (conditionApplies) {
    const adaption = R.pipe(
      R.propOr({}, 'api'),
      R.pick(['name', 'version']),
      R.values,
      R.append(adaption_name),
      R.concat(['..', '..', 'adaptions']),
      R.join('/'),
      require
    )(ctx);
    return R.pipe(
      R.path(['response', source]),
      R.call(R.reduce, jsonPatch.applyReducer, R.__, operations),
      R.assocPath(['response', source], R.__, ctx)
      // R.when(R.always(adaption), R.call(adaption, R.__, ctx))
    )(ctx);
  } else {
    return ctx;
  }
};

module.exports = config => ({
  requestPhase: ctx => ctx,
  responsePhase: ctx => {
    ctx.response = R.pipe(
      R.propOr([], 'transformations'),
      R.reduce(applyTransformation, ctx),
      R.prop('response')
    )(config);
  }
});
