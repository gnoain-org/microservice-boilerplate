const R = require('ramda');
const assocPathWith = require('../util/assocPathWith');
const filterDeepBy = require('../util/filterDeepBy');

const applyExpandAndInclude = (ctx, next) => {
  R.pipe(
    R.converge(R.reduce(R.flip(assocPathWith(R.__, R.prop('id')))), [
      R.pipe(
        R.pipe(
          R.converge(R.unapply(R.identity), [
            R.pipe(R.path(['route', 'parameters']), R.chain(R.prop('values'))),
            R.converge(R.concat, [
              R.path(['query', 'include']),
              R.path(['query', 'expand'])
            ])
          ]),
          R.map(
            R.pipe(R.sortWith([R.descend(R.length)]), R.uniqWith(R.startsWith))
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
    R.assocPath(['body', 'data'], R.__, ctx),
    R.curry(next)(null)
  )(ctx);
};

module.exports = applyExpandAndInclude;
