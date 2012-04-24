(function (exports) {

  "use strict";

  exports.init = function (app) {
    app.get('/', function (req, res) {
      res.render('index', {
        'title': 'Backbone.js, Node.js, MongoDB Todos with Socket.io'
      });
    });
  };

}(exports));