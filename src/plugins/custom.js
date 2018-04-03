const R = require('ramda');

const runCustomPlugin = R.curry(async (config, ctx, next) => {
  const customPlugin = R.pipe(
    R.propOr({}, 'api'),
    R.pick(['name', 'version']),
    R.values,
    R.append(config.name),
    R.concat(['.', 'custom_plugins']),
    R.join('/'),
    require
  )(ctx);
  await customPlugin(ctx, next);
});

module.exports = runCustomPlugin;
