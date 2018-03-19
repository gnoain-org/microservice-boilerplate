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
    R.reject(R.isEmpty)
  )(ctx);
  await next();
  const doStuff = ctx =>
    R.pipe(
      R.converge(R.reduce(R.flip(assocPathWith(R.__, R.prop('id')))), [
        R.pipe(
          R.pipe(
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
            R.map(
              R.pipe(
                R.sortWith([R.descend(R.length)]),
                R.uniqWith(R.startsWith)
              )
            ),
            R.apply(R.difference),
            R.map(R.split('.'))
          ),
          R.reduce(
            R.flip(assocPathWith(R.__, R.always(undefined))),
            ctx.body.data
          )
        ),
        R.pipe(R.path(['query', 'include']), R.map(R.split('.')))
      ]),
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
