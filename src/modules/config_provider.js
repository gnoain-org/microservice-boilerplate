const glob = require('glob');
const { Readable } = require('stream');
const fs = require('fs');

const configFilesDir = '/../config';

function* configFilesGenerator() {
  var files = glob.sync(__dirname + configFilesDir + '/**/*.json');
  for (let file of files) {
    yield file;
  }
}

const generateReader = (fileGenerator, stream) => {
  return () => {
    const nextFile = fileGenerator.next();
    if (nextFile.done) {
      stream.push(null);
    } else {
      fs.readFile(nextFile.value, 'utf8', (err, data) => {
        stream.push(err ? null : JSON.parse(data));
      });
    }
  };
};

const getConfigFiles = () => {
  const configStream = new Readable({ objectMode: true, highWaterMark: 0 });
  configStream._read = generateReader(configFilesGenerator(), configStream);
  return configStream;
};

module.exports = getConfigFiles;
