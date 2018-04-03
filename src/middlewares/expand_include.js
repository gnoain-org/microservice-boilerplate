const R = require('ramda');
const assocPathWith = require('../util/assocPathWith');
const filterDeepBy = require('../util/filterDeepBy');
const filterDeepByRecursive = require('../util/filterDeepByRecursive');

const applyExpandAndInclude = R.curry(async (api, route, ctx, next) => {
  ctx.state.include = R.pipe(
    R.pathOr('', ['state', 'request', 'query', 'include']),
    R.split(','),
    R.reject(R.isEmpty),
    R.map(R.split('.'))
  )(ctx);

  const getAllExcludablePaths = R.pipe(
    R.pathOr([], ['state', 'route', 'parameters']),
    R.filter(R.pipe(R.prop('name'), R.contains(R.__, ['expand', 'include']))),
    R.pluck('values'),
    R.flatten,
    R.uniq
  );

  const getPathsToKeep = R.pipe(
    R.pathOr({}, ['state', 'request', 'query']),
    R.pick(['include', 'expand']),
    R.values,
    R.join(','),
    R.split(','),
    R.chain(path =>
      R.pipe(
        R.split('.'),
        R.length,
        R.inc,
        R.range(1),
        R.chain(times => R.join('.', path.split('.', times)))
      )(path)
    ),
    R.uniq
  );

  const getPathsToExclude = R.pipe(
    R.converge(R.difference, [getAllExcludablePaths, getPathsToKeep]),
    R.map(R.split('.'))
  );

  ctx.state.exclude = getPathsToExclude(ctx);

  await next();

  const assocPathsWith = R.curry((paths, fn, target) =>
    R.reduce(R.flip(assocPathWith(R.__, fn)), target, paths)
  );

  const applyInclusion = R.converge(assocPathsWith(R.__, R.prop('id'), R.__), [
    R.pipe(R.prop(['include']), R.map(R.concat(['body', 'data']))),
    R.identity
  ]);

  const applyExclusion = R.converge(
    assocPathsWith(R.__, R.always(undefined), R.__),
    [R.pipe(R.prop(['exclude']), R.map(R.concat(['body', 'data']))), R.identity]
  );

  const doStuff = ctx => {
    ctx.state.body = R.pipe(
      R.prop('state'),
      applyExclusion,
      applyInclusion,
      R.prop('body'),
      filterDeepBy(value => typeof value !== 'undefined'),
      filterDeepByRecursive(R.complement(R.isEmpty))
    )(ctx);
    return ctx;
  };

  if (R.is(Array)(ctx.state.body.data)) {
    ctx.state.body.data = R.pipe(
      R.path(['state', 'body', 'data']),
      R.map(element => {
        return doStuff(R.assocPath(['state', 'body'], { data: element }, ctx));
      }),
      R.map(R.path(['state', 'body', 'data']))
    )(ctx);
  } else {
    doStuff(ctx);
  }
});

module.exports = applyExpandAndInclude;
