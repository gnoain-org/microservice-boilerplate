const R = require('ramda');

const input = require('./input');

const locale = 'fr_FR';

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
  R.map(category => {
    const categoryLocales = R.keys(category.name_locales);
    const locales = R.map(
      R.applySpec({
        id: R.identity,
        values: getLocalizedFields(R.__, category)
      }),
      categoryLocales
    );
    const localizedFields = getLocalizedFields(locale, category);
    const test = R.mergeDeepRight(category, localizedFields);
    test.locales = locales;
    return test;
  }),
  filterDeepBy(value => typeof value !== 'undefined')
)(input.children);

console.log(result);
