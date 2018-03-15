const R = require('ramda');

//const input = require('./input_categories');

const locale = 'fr_FR';
// const query = {
//   expand: 'locales',
//   locale: 'fr_FR'
// };

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

const filterDeepBy = R.curry((func, value) => {
  const isObjectLike = typeof value == 'object' && value !== null;
  if (isObjectLike) {
    return R.pipe(R.filter(func), R.map(filterDeepBy(func)))(value);
  } else {
    return value;
  }
});

const cleanObject = filterDeepBy(value => typeof value !== 'undefined');

const transformCategory = R.ifElse(
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
);

const adaptCategory = R.pipe(transformCategory, cleanObject);
const adaptCategories = R.pipe(R.map(transformCategory), cleanObject);
