(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , Todo = mongoose.model('Todo');

  exports.init = function (socket) {

    // ----------------------------------------------------
    // Create
    //
    socket.on('todo:create', function (data, callback) {
      var t = new Todo(data);
      t.save(function (err) {
        socket.emit('/todo:create', t);
        socket.broadcast.emit('/todo:create', t);
        callback(err, t);
      });
    });

    // ----------------------------------------------------
    // Read
    //
    socket.on('todo:read', function (data, callback) {
      Todo.find(data._id || {}, callback);
    });

    // ----------------------------------------------------
    // Update
    //
    socket.on('todo:update', function (data, callback) {
      Todo.findById(data._id, function (err, result) {
        if (err) {
          callback(err, data);
        } else {
          result.title = data.title;
          result.order = data.order;
          result.done = data.done;
          result.save(function (err) {
            socket.emit('/todo/' + data._id + ':update', result);
            socket.broadcast.emit('/todo/' + data._id + ':update', result);
            callback(err, result);
          });
        }
      });
    });

    // ----------------------------------------------------
    // Delete
    //
    socket.on('todo:delete', function (data, callback) {
      Todo.findById(data._id, function (err, result) {
        if (err) {
          callback(err, data);
        } else {
          if (result) {
            result.remove();
            result.save(function (err) {
              socket.emit('/todo/' + data._id + ':delete', result);
              socket.broadcast.emit('/todo/' + data._id + ':delete', result);
              callback(err, result);
            });
          }
        }
      });
    });

  };

}(exports));