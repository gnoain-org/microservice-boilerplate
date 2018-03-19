const R = require('ramda');

const assocPathWith = R.curry((path, fn, obj) => {
  const currentPath = R.head(path);
  const currentValue = R.prop(currentPath, obj);
  return R.ifElse(
    R.pipe(R.length, R.equals(1)),
    R.pipe(
      R.head,
      R.prop(R.__, obj),
      R.ifElse(R.is(Array), R.map(fn), fn),
      R.when(R.allPass([R.is(Array), R.all(R.isNil)]), R.always(undefined)),
      R.assoc(currentPath, R.__, obj)
    ),
    R.pipe(
      R.tail,
      R.of,
      assocPathWith(R.__, fn),
      R.when(R.always(R.is(Array, currentValue)), R.map),
      R.apply(R.__, R.of(currentValue)),
      R.assoc(currentPath, R.__, obj)
    )
  )(path);
});

module.exports = assocPathWith;
