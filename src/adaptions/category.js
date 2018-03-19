const R = require('ramda');

const filterDeepBy = require('../util/filterDeepBy');
const cleanObject = filterDeepBy(value => typeof value !== 'undefined');

const getLocalizedFields = R.curry((locale, source) => {
  const localizedPaths = [
    ['name'],
    ['description'],
    ['previous_names'],
    ['keywords'],
    ['title'],
    ['type', 'url']
  ];

  return R.reduce(
    (acc, path) => {
      return R.useWith(
        R.converge(R.unapply(R.reduce(R.mergeDeepRight, {})), [
          R.pipe(
            R.append(locale),
            R.path(R.__, source),
            R.assocPath(path, R.__, {})
          ),
          R.assocPath(R.__, undefined, {}),
          R.always(acc)
        ]),
        [R.adjust(R.flip(R.concat)('_locales'), -1)]
      )(path);
    },
    {},
    localizedPaths
  );
});

const transformCategory = R.curry((locale, category) => {
  return R.ifElse(
    R.path(['name_locales', locale]),
    R.converge(R.unapply(R.reduce(R.mergeDeepRight, {})), [
      R.evolve({ children: R.map(c => transformCategory(c)) }),
      getLocalizedFields(locale),
      R.pipe(
        R.converge(R.map, [
          R.pipe(
            R.unary(R.flip(getLocalizedFields)),
            R.objOf('values'),
            R.merge({ id: R.identity }),
            R.applySpec
          ),
          R.pipe(R.propOr({}, 'name_locales'), R.keys)
        ]),
        R.objOf('locales')
      )
    ]),
    R.always(undefined)
  )(category);
});

const adaptCategory = ctx => {
  const locale = ctx.query.locale;
  const category = ctx.body.data;
  return R.pipe(transformCategory(locale), cleanObject)(category);
};

module.exports = adaptCategory;
