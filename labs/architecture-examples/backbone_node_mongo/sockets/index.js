(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , todo = require('./todo')
    , connect = require('express/node_modules/connect')
    , parseCookie = connect.utils.parseCookie
    , Session = connect.middleware.session.Session;

  exports.init = function (io, sessionStore) {

    io.set('authorization', function (data, callback) {

      if (!data.headers.cookie) {
        callback('No cookie transmitted.', false);
      }

      data.cookie = parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];
      data.sessionStore = sessionStore;

      sessionStore.get(data.sessionID, function (err, session) {
        console.log('sessionStore.get', data.sessionID, err, session);

        if (err || !session) {
          callback('No session', false);
        } else {
          data.session = new Session(data, session);
          callback(null, true);
        }

      });

    });

    io.sockets.on('connection', function (socket) {
      var sessionID = socket.handshake.sessionID;

      console.log('A socket with sessionID ' + sessionID + ' connected!');

      socket.log.info(
        'a socket with sessionID',
        socket.handshake.sessionID,
        'connected'
      );

      socket.on('set value', function (val) {
        sessionID.reload(function () {
          sessionID.value = val;
          sessionID.touch().save();
        });
      });

      socket.on('connect', function (data, callback) {
        console.log('connect ' + sessionID);
        // nothing yet
      });

      socket.on('disconnect', function (data, callback) {
        console.log('disconnect ' + sessionID);
        // nothing yet
      });

      todo.init(socket);
    });

  };

}(exports));