const R = require('ramda');

const ctx = {
  query: {
    include: ['children.locales'],
    expand: ['children']
  },
  route: {
    path: '/categories',
    parameters: [
      {
        name: 'include',
        values: ['locales', 'children', 'children.locales']
      },
      {
        name: 'expand',
        values: ['locales', 'children', 'children.locales']
      }
    ]
  },
  body: {
    data: {
      some: 'stuff',
      locales: [{ id: 'en_GB', name: 'locales' }],
      children: [
        { locales: [{ id: 'en_GB', name: 'locales' }], someOther: 'stuff' }
      ]
    }
  }
};

const applyExpandAndInclude = (ctx, next) => {
  const assocPathWith = R.curry((path, fn, obj) => {
    const currentPath = R.head(path);
    const currentValue = R.prop(currentPath, obj);
    return R.ifElse(
      R.pipe(R.length, R.equals(1)),
      R.pipe(
        R.head,
        R.prop(R.__, obj),
        R.ifElse(R.is(Array), R.map(fn), fn),
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
  ctx.body.data = R.converge(
    R.reduce(R.flip(assocPathWith(R.__, R.prop('id')))),
    [
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
    ]
  )(ctx);
  return next(null, ctx);
};

applyExpandAndInclude(ctx, (error, ctx) => {
  console.log(ctx.body);
});
