(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , todo = require('./todo');

  exports.init = function (io) {
    io.sockets.on('connection', function (socket) {
      todo.init(socket);
    });
  };

}(exports));