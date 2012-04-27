(function (exports) {

  "use strict";
  var store = require('redis').createClient();

  exports.addListeners = function (ModelClass, rooturl, socket, hs) {
    var sessionID = hs.sessionID
      , secsToExpireLock = 120;

    // ---------------
    // Create
    //
    socket.on(rooturl + ':create', function (data, callback) {
      var t = new ModelClass(data)
        , name = '/' + rooturl + ':create';
      t.save(function (err) {
        socket.emit(name, t);
        socket.broadcast.emit(name, t);
      });
    });

    // ---------------
    // Read
    //
    socket.on(rooturl + ':read', function (data, callback) {
      ModelClass.find(data._id || {}, callback);
    });

    // ---------------
    // Update
    //
    socket.on(rooturl + ':update', function (data, callback) {
      var key, name;

      if (data && data._id) {
        key = rooturl + ':' + data._id;
        name = '/' + rooturl + '/' + data._id + ':update';

        // Don't do an update if the lock isn't theirs.
        store.get(key, function (err, result) {
          if (!result || result === sessionID) {

            ModelClass.findById(data._id, function (err, result) {
              if (err) {
                callback(err, data);
              } else {
                result.title = data.title;
                result.order = data.order;
                result.done = data.done;
                result.save(function (err) {
                  socket.emit(name, result);
                  socket.broadcast.emit(name, result);
                });
              }
            });

          }
        });
      }

    });

    // ---------------
    // Delete
    //
    socket.on(rooturl + ':delete', function (data, callback) {
      var key, name;

      if (data && data._id) {
        key = rooturl + ':' + data._id;
        name = '/' + rooturl + '/' + data._id + ':delete';

        // Don't delete if the record is locked.
        store.exists(key, function (err, found) {
          if (found === 0) {
            ModelClass.findById(data._id, function (err, result) {
              if (err) {
                callback(err, data);
              } else {
                if (result) {
                  result.remove();
                  result.save(function (err) {
                    socket.emit(name, result);
                    socket.broadcast.emit(name, result);
                  });
                }
              }
            });
          }
        });

      }
    });

    // ---------------
    // Lock
    //
    socket.on(rooturl + ':lock', function (data, callback) {
      var key = rooturl + ':' + data._id
        , name = '/' + rooturl + '/' + data._id + ':lock';

      store.exists(key, function (err, found) {

        if (found !== 0) {
          callback(err, false);
        } else {
          store.set(key, sessionID, function (err, result) {
            if (!err) {
              store.expire(key, secsToExpireLock, store.print);
              socket.emit(name, true);
              socket.broadcast.emit(name, true);
            }
          });
        }

      });

    });

    // ---------------
    // Unlock
    //
    socket.on(rooturl + ':unlock', function (data, callback) {
      var key = rooturl + ':' + data._id
        , name = '/' + rooturl + '/' + data._id + ':unlock';

      store.get(key, function (err, result) {

        if (err) {
          callback(err, false);
        } else {

          // User is only allowed to unlock the model if
          // they were the person who locked it.
          if (result === sessionID) {
            store.del(key, function (err, result) {
              socket.emit(name, true);
              socket.broadcast.emit(name, true);
            });
          }

        }

      });
    });
  };

  exports.removeListeners = function (rooturl, socket) {
    socket.removeAllListeners(rooturl + ':create');
    socket.removeAllListeners(rooturl + ':read');
    socket.removeAllListeners(rooturl + ':update');
    socket.removeAllListeners(rooturl + ':delete');
    socket.removeAllListeners(rooturl + ':lock');
    socket.removeAllListeners(rooturl + ':unlock');
  };

}(exports));