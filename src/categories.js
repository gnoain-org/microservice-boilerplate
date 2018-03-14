const R = require('ramda');

const input = require('./input');

const locale = 'fr_FR';
const query = {
  expand: 'locales',
  locale: 'fr_FR'
};

const getLocalizedFields = R.curry((locale, source) => {
  const localePaths = [
    ['name'],
    ['description'],
    ['previous_names'],
    ['keywords'],
    ['title'],
    ['type', 'url']
  ];

  return R.reduce(
    (acc, path) => {
      var test = R.pipe(
        R.adjust(R.flip(R.concat)('_locales'), -1),
        localePath => {
          acc = R.assocPath(localePath, undefined, acc);
          return R.pipe(
            R.append(locale),
            R.flip(R.path)(source),
            R.assocPath(path, R.__, acc)
          )(localePath);
        }
      )(path);
      return test;
    },
    {},
    localePaths
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

const result = R.pipe(
  R.filter(R.path(['name_locales', locale])),
  R.map(
    R.converge(R.unapply(R.reduce(R.mergeDeepRight, {})), [
      R.identity,
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
    ])
  ),
  filterDeepBy(value => typeof value !== 'undefined')
)(input.children);

console.log(result);
