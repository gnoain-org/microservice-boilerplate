const R = require('ramda');
const assocPathWith = require('../util/assocPathWith');
const filterDeepBy = require('../util/filterDeepBy');

const applyExpandAndInclude = async (ctx, next) => {
  ctx.state.include = R.pipe(
    R.pathOr('', ['query', 'include']),
    R.split(','),
    R.reject(R.isEmpty),
    R.map(R.split('.'))
  )(ctx);

  ctx.state.exclude = getPathsToExclude(ctx);

  const getAllExcludablePaths = R.pipe(
    R.pathOr([], ['state', 'route', 'parameters']),
    R.filter(R.pipe(R.prop('name'), R.contains(R.__, ['expand', 'include']))),
    R.pluck('values'),
    R.flatten,
    R.uniq
  );

  const getPathsToKeep = R.pipe(
    R.propOr({}, 'query'),
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

  const getPathsToExclude = R.converge(R.difference, [
    getAllExcludablePaths,
    getPathsToKeep
  ]);

  await next();
  // const getPathsToExcludeCaca = R.pipe(
  //   R.converge(R.unapply(R.identity), [
  //     R.pipe(
  //       R.path(['state', 'route', 'parameters']),
  //       R.chain(R.prop('values'))
  //     ),
  //     R.converge(R.concat, [
  //       R.path(['query', 'include']),
  //       R.path(['query', 'expand'])
  //     ])
  //   ]),
  //   R.map(R.pipe(R.sortWith([R.descend(R.length)]), R.uniqWith(R.startsWith))),
  //   R.apply(R.difference),
  //   R.map(R.split('.'))
  // );

  // const pene = R.juxt([
  //   R.always(R.prop(['body', 'data'])),
  //   R.pipe(
  //     R.path(['state', 'exclude']),
  //     R.reduce(R.flip(assocPathWith(R.__, R.always(undefined))), R.__)
  //   ),
  //   R.pipe(
  //     R.path(['state', 'include']),
  //     R.reduce(R.flip(assocPathWith(R.__, R.prop('id'))), R.__)
  //   )
  // ]);

  // ctx.body.data = R.apply(R.pipe, pene(ctx))(ctx);

  // R.pipe(
  //   R.path(['state', 'exclude']),
  //   R.map(R.concat(['body', 'data'])),
  //   R.reduce(R.flip(assocPathWith(R.__, R.always(undefined))), ctx)
  // );

  // const applyInclusion = R.pipe(
  //   R.path(['state', 'include']),
  //   R.reduce(R.flip(assocPathWith(R.__, R.prop('id'))))
  // );

  // R.converge(R.reduce(R.flip(assocPathWith(R.__, R.prop('id')))), [
  //   applyExclusion,
  //   R.pipe(R.path(['query', 'include']), R.map(R.split('.')))
  // ]);

  const assocPathsWith = R.curry((paths, fn, target) =>
    R.reduce(R.flip(assocPathWith(R.__, fn)), target, paths)
  );

  const applyExclusion = R.converge(
    assocPathsWith(R.__, R.always(undefined), R.__),
    [R.path(['state', 'exclude']), R.identity]
  );

  const applyInclusion = R.converge(assocPathsWith(R.__, R.prop('id'), R.__), [
    R.path(['state', 'include']),
    R.identity
  ]);

  const doStuff = ctx =>
    R.pipe(
      applyExclusion,
      applyInclusion,
      filterDeepBy(value => typeof value !== 'undefined'),
      filterDeepBy(R.complement(R.isEmpty))
    )(ctx);

  if (R.is(Array)(ctx.body.data)) {
    ctx.body.data = R.map(element => {
      return doStuff(R.assoc('body', { data: element }, ctx));
    }, ctx.body.data);
  } else {
    ctx.body.data = doStuff(ctx);
  }
};

module.exports = applyExpandAndInclude;
