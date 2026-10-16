define([], function () {
  "use strict";

  const basePath = "./v1/ext/KDB3/images/";

  function readImagePath(_KDB) {
    void _KDB;
    return basePath;
  }

  return {
    basePath: basePath,
    readImagePath: readImagePath
  };
});
