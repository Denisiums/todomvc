(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , store = require('redis').createClient()
    , pub = require('redis').createClient()
    , sub = require('redis').createClient()
    , Todo = mongoose.model('Todo');

  exports.init = function (socket, hs) {
    var sessionID = hs.sessionID;

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
      var key = 'todo:' + data._id;

      // Don't do an update if the record is locked.
      store.exists(key, function (err, found) {
        if (found === 0) {

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

        }
      });

    });

    // ----------------------------------------------------
    // Delete
    //
    socket.on('todo:delete', function (data, callback) {
      var key = 'todo:' + data._id;

      // Don't delete if the record is locked.
      store.exists(key, function (err, found) {
        if (found === 0) {

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

        }
      });

    });

    // ----------------------------------------------------
    // Lock
    //
    socket.on('todo:lock', function (data, callback) {
      var key = 'todo:' + data._id;

      store.exists(key, function (err, found) {

        if (found !== 0) {
          callback(err, false);
        } else {
          store.set(key, sessionID, function (err, result) {
            if (!err) {
              store.expire(key, 60, store.print);
              console.log(key + " locked.");
              //socket.emit('/todo/' + data._id + ':lock', true);
              socket.broadcast.emit('/todo/' + data._id + ':lock', true);
              callback(err, true);
            }
          });
        }

      });

    });

    // ----------------------------------------------------
    // Unlock
    //
    socket.on('todo:unlock', function (data, callback) {
      var key = 'todo:' + data._id;

      store.get(key, function (err, result) {

        if (err) {
          callback(err, false);
        } else {

          // User is only allowed to unlock the model if
          // they were the person who locked it.
          if (result === sessionID) {
            store.del(key, function (err, result) {
              console.log(key + " unlocked.");
              //socket.emit('/todo/' + data._id + ':unlock', true);
              socket.broadcast.emit('/todo/' + data._id + ':unlock', true);
              callback(err, true);
            });
          }

        }

      });
    });
  };

}(exports));