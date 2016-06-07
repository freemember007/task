function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'action': 'check', // check:检查, find:查询, read:标记为已读, readAll:标记所有为已读
  //   'userId': 'EuGz444d',
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var bat = modules.oBatch;
  var now = new Date();
  now.setDate(now.getDate() - 7);
  var year = now.getFullYear();
  var month = (now.getMonth() + 1).toString();
  var date = now.getDate().toString();
  var then = year + '-' + month.replace(/^(\d)$/, '0$1') + '-' + date.replace(/^(\d)$/, '0$1') + ' 00:00:00';

  if (request.body.action === 'find') {
    find()
  } else if (request.body.action === 'check') {
    check()
  } else if (request.body.action === 'read') {
    read()
  } else {
    readAll()
  }

  function find() {
    db.find({
      'table': 'notification',
      'where': {
        'userId': request.body.userId,
        'createdAt': { '$gt': { '__type': 'Date', 'iso': then } }
      },
      'order': '-createdAt'
    }, function(err, data) {
      data = JSON.parse(data).results;
      response.send(data)
    })
  }

  function check() {
    db.find({
      'table': 'notification',
      'where': {
        'isRead': { '$ne': true },
        'userId': request.body.userId,
        'createdAt': { '$gt': { '__type': 'Date', 'iso': then } }
      },
      'limit': 0,
      'count': 1
    }, function(err, data) {
      data = JSON.parse(data);
      response.send(data)
    })
  }

  function read() {
    db.update({
      'table': 'notification',
      'objectId': request.body.notificationId,
      'data': {
        'isRead': true
      }
    }, function(err, data) {
      data = JSON.parse(data);
      response.send(data)
    })
  }

  function readAll() {
    db.find({
      'table': 'notification',
      'where': {
        'isRead': { '$ne': true },
        'userId': request.body.userId,
        'createdAt': { '$gt': { '__type': 'Date', 'iso': then } }
      },
      'limit': 50 //sdk要求下面的批量请求数不能大于50
    }, function(err, data) {
      var notifications = JSON.parse(data).results;
      var arr = [];
      for (var i = 0; i < notifications.length; i++) {
        arr.push({
          'method': 'PUT',
          'path': '/1/classes/notification/' + notifications[i].objectId,
          'body': {
            'isRead': true
          }
        })
      }
      bat.exec({
        "data": {
          "requests": arr
        }
      }, function(err, data) {
        data = JSON.parse(data);
        response.send(data)
      });
    })


  }



}
exports.notification = onRequest;