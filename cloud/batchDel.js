function onRequest(request, response, modules) {

  var db = modules.oData;
  var bat = modules.oBatch;
  var batchDel = batchDel;

  batchDel();

  function batchDel() {
    db.find({
      'table': 'task',
      'where': {
        'assignee': request.body.assignee
      },
      'limit': 50 //sdk要求下面的批量请求数不能大于50
    }, function(err, data) {
      var tasks = JSON.parse(data).results;
      // response.send(tasks)
      var arr = [];
      for (var i = 0; i < tasks.length; i++) {
        arr.push({
          'method': 'DELETE',
          'path': '/1/classes/task/' + tasks[i].objectId
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

exports.batchDel = onRequest;