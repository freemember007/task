function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'action': 'check', // check:检查, find:查询, read:标记为已读
  //   'userId': 'EuGz444d',
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var now = new Date();
  now.setDate(now.getDate() - 7);
  var year = now.getFullYear();
  var month = (now.getMonth()+1).toString();
  var date = now.getDate().toString();
  var then = year + '-' + month.replace(/^(\d)$/, '0$1') + '-' + date.replace(/^(\d)$/, '0$1') + ' 00:00:00';
  // response.send(then)
  
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
      'where': { 
        'userId': request.body.userId,
        'createdAt': {'$gt':{'__type':'Date','iso':then}}
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
        'isRead': {'$ne': true},
        'userId': request.body.userId,
        'createdAt': {'$gt':{'__type':'Date','iso':then}}
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