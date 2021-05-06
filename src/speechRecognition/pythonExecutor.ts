const { exec } = require('child_process');
const utf8 = require('utf8');

exports.execPython = function (python: string, pythonScript: string, args: string) {
  return new Promise((resolve, rejects) => {
    exec(`chcp 65001 | ${python} ${pythonScript} ${args}`,
      (err: Error, stdout: string | Buffer) => {
        resolve(utf8.decode(eval('"' + stdout.slice(2, -3) + '"')));
      });
  });
};
