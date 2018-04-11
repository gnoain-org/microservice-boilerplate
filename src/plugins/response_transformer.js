const jsonPatch = require('fast-json-patch');
const R = require('ramda');

const jsonLogicChecker = require('../util/json_logic_checker');

const applyAdaption = R.curry((adaption_name, ctx) => {
  const adaptionFilePath = R.pipe(
    R.propOr({}, 'api'),
    R.pick(['name', 'version']),
    R.values,
    R.append(adaption_name),
    R.concat(['..', 'adaptions']),
    R.join('/')
  )(ctx);
  try {
    require(adaptionFilePath)(ctx);
  } catch (error) {
    throw console.log('Fallo al aplicar la transformación ' + adaption_name);
  }
});

const applyOperations = R.curry((source, operations, ctx) => {
  let target = R.defaultTo({}, R.prop(source, ctx));
  R.when(
    R.not(jsonPatch.validate(operations, target)),
    R.reduce(jsonPatch.applyReducer, target, operations)
  );
});

const applyTransformation = R.curry(
  (ctx, { source, condition, operations, adaption }) => {
    const conditionApplies = jsonLogicChecker.validateLogic(
      R.prop('response', condition)
    );
    R.when(
      conditionApplies,
      R.ifElse(
        R.always(adaption),
        applyAdaption(adaption),
        applyOperations(source, operations)
      )
    )(ctx);
  }
);

module.exports = config => ({
  requestPhase: ctx => ctx,
  responsePhase: ctx =>
    R.pipe(
      R.propOr([], 'transformations'),
      R.forEach(applyTransformation(ctx))
    )(config)
});
