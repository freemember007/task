function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'taskId': '4e20f3d7c8' //任务ID
  // }

  var db = modules.oData;
  var rel = modules.oRelation;

  if(request.body.action === 'find'){
    find()
  }else if(request.body.action === 'check'){
    check()
  }else{
    read()
  }

  function find() {
    db.find({
      'table': 'notification',
      'where': { 'userId': request.body.userId},
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
        'isRead': {'$ne': true},
        'userId': request.body.userId
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

}
exports.notification = onRequest;