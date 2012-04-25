(function (exports) {

  "use strict";

  var mongoose = require('mongoose')
    , todo = require('./todo')
    , connect = require('express/node_modules/connect')
    , parseCookie = connect.utils.parseCookie
    , Session = connect.middleware.session.Session;

  exports.init = function (sio, sessionStore) {

    sio.set('authorization', function (data, callback) {

      if (!data.headers.cookie) {
        return callback('No cookie transmitted.', false);
      }

      data.cookie = parseCookie(data.headers.cookie);
      data.sessionID = data.cookie['express.sid'];
      data.sessionStore = sessionStore;

      sessionStore.get(data.sessionID, function (err, session) {
        console.log('sessionStore.get', data.sessionID, err, session);

        if (err || !session) {
          return callback('Error', false);
        } else {
          console.log(data.sessionID, session);
          data.session = new Session(data, session);
          return callback(null, true);
        }

      });

    });

    sio.on('connection', function (socket) {
      var hs = socket.handshake
        , sessionID = hs.sessionID;

      console.log('A socket with sessionID ' + sessionID + ' connected!');

      // ----------------------------------------------------
      // Connect
      //
      socket.on('connect', function (data, callback) {
        console.log('connect ' + sessionID);
        // nothing yet
      });

      // ----------------------------------------------------
      // Disconnect
      //
      socket.on('disconnect', function (data, callback) {
        console.log('disconnect ' + sessionID);
        // nothing yet
      });

      todo.init(socket, hs);
    });


  };

}(exports));