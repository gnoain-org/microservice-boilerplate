const R = require('ramda');
const assocPathWith = require('../util/assocPathWith');
const filterDeepBy = require('../util/filterDeepBy');

const applyExpandAndInclude = async (ctx, next) => {
  ctx.query.include = R.pipe(
    R.pathOr('', ['query', 'include']),
    R.split(','),
    R.reject(R.isEmpty)
  )(ctx);
  ctx.query.expand = R.pipe(
    R.pathOr('', ['query', 'expand']),
    R.split(','),
    R.reject(R.isEmpty),
    R.chain(path => {
      // const fn = (str, result) => {
      //   if (str === '') {
      //     return result;
      //   } else {
      //     const index = R.lastIndexOf('.', str);
      //     return fn(str.substr(0, index), result.concat(str));
      //   }
      // };

      // const fn = (str, result) => {
      //   const index = R.lastIndexOf('.', str);
      //   if (index === -1) {
      //     return result.concat(str);
      //   } else {
      //     return fn(str.substr(0, index), result.concat(str));
      //   }
      // };
      // return fn(path, []);

      const pathParts = path.split('.');
      const fn = R.map(part => {
        return R.join(
          '.',
          R.slice(R.indexOf(part, pathParts), Infinity, pathParts)
        );
      });
      const caca = fn(path.split('.'));

      // const fn = (pathParts, result) => {
      //   if (R.isEmpty(pathParts)) {
      //     return result;
      //   } else {
      //     result.push(pathParts.join('.'));
      //     return fn(R.init(pathParts), result);
      //   }
      // };
      return fn(path.split('.'));
    })
  )(ctx);
  await next();
  const getPathsToExclude = R.pipe(
    R.converge(R.unapply(R.identity), [
      R.pipe(
        R.path(['state', 'route', 'parameters']),
        R.chain(R.prop('values'))
      ),
      R.converge(R.concat, [
        R.path(['query', 'include']),
        R.path(['query', 'expand'])
      ])
    ]),
    R.map(R.pipe(R.sortWith([R.descend(R.length)]), R.uniqWith(R.startsWith))),
    R.apply(R.difference),
    R.map(R.split('.'))
  );
  const applyExclusion = R.pipe(
    getPathsToExclude,
    R.tap(R.bind(console.log, console)),
    R.reduce(R.flip(assocPathWith(R.__, R.always(undefined))), ctx.body.data)
  );
  const applyIncludeAndExpand = R.converge(
    R.reduce(R.flip(assocPathWith(R.__, R.prop('id')))),
    [applyExclusion, R.pipe(R.path(['query', 'include']), R.map(R.split('.')))]
  );

  const doStuff = ctx =>
    R.pipe(
      applyIncludeAndExpand,
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
