const { PYTHON, PYTHON_SPEECH_RECOGNITION_SCRIPT } = require('../../config.json');
const { execPython } = require('./pythonExecutor');
const wav = require('wav');

exports.resolveSpeech = function (filename: string) {
  const text = execPython(PYTHON, PYTHON_SPEECH_RECOGNITION_SCRIPT, filename);
  return text;
};
exports.createOutputStream = () => {
  const fileDir = __dirname + `/../recordings/${Date.now()}.wav`;
  // eslint-disable-next-line new-cap
  const outputFileStream = wav.FileWriter(fileDir, {
    sampleRate: 48000,
    channels: 2,
    bitDepth: 16,
  });
  return [outputFileStream, fileDir];
};
