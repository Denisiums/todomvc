(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , connect = require('express/node_modules/connect')
    , parseCookie = connect.utils.parseCookie
    , Session = connect.middleware.session.Session
    , crud = require('./crud')
    , store = require('redis').createClient()
    , pub = require('redis').createClient()
    , sub = require('redis').createClient();

  exports.init = function (sio, sessionStore) {

    sub.subscribe('cms');

    // ----------------------------------------------------
    // Autherization
    //
    sio.set('authorization', function (data, callback) {

      if (!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
      }

      data.cookie = parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];
      data.sessionStore = sessionStore;

      sessionStore.get(data.sessionID, function (err, session) {
        if (err || !session) {
          return callback('Error', false);
        } else {
          data.session = new Session(data, session);
          return callback(null, true);
        }
      });

    });

    // ----------------------------------------------------
    // Connection
    //
    sio.on('connection', function (socket) {
      var hs = socket.handshake
        , watchedModels = []
        , sessionID = hs.sessionID;

      sub.on('message', function (channel, message) {
        var msg = JSON.parse(message);
        if (msg && msg.key) {
          socket.emit(msg.key, msg.data);
        }
      });

      // ----------------------------------------------------
      // Connect
      //
      socket.on('connect', function (data, callback) {
        var i, len, d = {};

        watchedModels = data;

        function fillData(model, count) {
          d[model] = { locks: [] };
          return function (err, result) {
            d[model].locks = result;
            if (Object.keys(d).length === count) {
              callback(null, d);
            }
          };
        }

        for (i = 0, len = data.length; i < len; i++) {
          store.hkeys(data[i], fillData(data[i], len));
        }

      });

      // ----------------------------------------------------
      // Disconnect
      //
      socket.on('disconnect', function (data, callback) {

        function removeLocks(val) {
          var key = val;
          return function (err, result) {
            var keys = Object.keys(result)
              , i = keys.length
              , id;
            while (i--) {
              id = keys[i];
              if (result[id] === sessionID) {
                store.hdel(key, id);
                pub.publish('cms', '/' + key + '/' + id + ':unlock');
                //socket.broadcast.emit('/' + key + '/' + id + ':unlock', true);
              }
            }
          };
        }

        watchedModels.forEach(function (val, idx, array) {
          store.hgetall(val, removeLocks(val));
        });

      });

      crud.addListeners({
        'model': mongoose.model('Todo'),
        'rooturl': 'todo',
        'socket': socket,
        'handshake': hs,
        'pub': pub
      });
    });

  };

}(exports));