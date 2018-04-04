const R = require('ramda');

const pluginResolver = R.curry((config, ctx) =>
  R.pipe(
    R.propOr({}, 'api'),
    R.pick(['name', 'version']),
    R.values,
    R.append(config.name),
    R.concat(['.', 'custom_plugins']),
    R.join('/'),
    require
  )(ctx)
);

module.exports = config => {
  const customPluginResolver = pluginResolver(config);
  return {
    requestPhase: ctx => customPluginResolver(ctx).requestPhase(ctx),
    responsePhase: ctx => customPluginResolver(ctx).responsePhase(ctx)
  };
};
