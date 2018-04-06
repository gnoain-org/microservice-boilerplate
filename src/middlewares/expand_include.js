const R = require('ramda');
const assocPathWith = require('../util/assocPathWith');
const filterDeepBy = require('../util/filterDeepBy');
const filterDeepByRecursive = require('../util/filterDeepByRecursive');

// route config -> excludable paths
const getAllExcludablePaths = R.pipe(
  R.propOr([], 'parameters'),
  R.filter(R.pipe(R.prop('name'), R.contains(R.__, ['expand', 'include']))),
  R.pluck('values'),
  R.flatten,
  R.uniq
);

// ctx -> paths to keep
const getPathsToKeep = R.pipe(
  R.pathOr({}, ['request', 'query']),
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

const assocPathsWith = R.curry((paths, fn, target) =>
  R.reduce(R.flip(assocPathWith(R.__, fn)), target, paths)
);

const applyInclusion = R.converge(assocPathsWith(R.__, R.prop('id'), R.__), [
  R.pipe(
    R.pathOr([], ['state', 'include']),
    R.map(R.concat(['response', 'body']))
  ),
  R.identity
]);

const applyExclusion = R.converge(
  assocPathsWith(R.__, R.always(undefined), R.__),
  [
    R.pipe(
      R.pathOr([], ['state', 'exclude']),
      R.map(R.concat(['response', 'body']))
    ),
    R.identity
  ]
);

//ctx -> cleaned body;
const expandAndInclude = ctx => {
  return R.pipe(
    applyExclusion,
    applyInclusion,
    R.pathOr({}, ['response', 'body']),
    filterDeepBy(value => typeof value !== 'undefined'),
    filterDeepByRecursive(R.complement(R.isEmpty))
  )(ctx);
};

const applyExpandAndInclude = R.curry(async (api, route, ctx, next) => {
  ctx.state.include = R.pipe(
    R.pathOr('', ['request', 'query', 'include']),
    R.split(','),
    R.reject(R.isEmpty),
    R.map(R.split('.'))
  )(ctx);

  const excludablePaths = getAllExcludablePaths(route);

  ctx.state.exclude = R.pipe(
    getPathsToKeep,
    R.difference(excludablePaths),
    R.map(R.split('.'))
  )(ctx);

  await next();
  if (R.is(Array)(ctx.response.body)) {
    ctx.response.body = R.pipe(
      R.path(['response', 'body']),
      R.map(element => {
        return expandAndInclude(
          R.assocPath(['response', 'body'], element, ctx)
        );
      })
    )(ctx);
  } else {
    expandAndInclude(ctx);
  }
});

module.exports = applyExpandAndInclude;
