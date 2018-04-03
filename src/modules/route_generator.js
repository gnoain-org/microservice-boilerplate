const R = require('ramda');
const configProvider = require('./config_provider');
const stackComposer = require('./stack_composer');
const { EventEmitter } = require('events');

const routeGenerator = () => {
  const routeEmitter = new EventEmitter();
  const emitRoute = route => routeEmitter.emit('newroute', route);
  const configStream = configProvider();
  configStream.on('data', api => {
    R.map(
      R.pipe(
        R.applySpec({
          path: R.pipe(
            R.path(['path', 'url']),
            R.concat('/' + api.name + '/' + api.version)
          ),
          method: R.prop('method'),
          middleware: stackComposer(api)
        }),
        emitRoute
      ),
      api.routes
    );
  });
  return routeEmitter;
};
module.exports = routeGenerator;
