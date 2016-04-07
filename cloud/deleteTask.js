function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'taskId': '', //必须
  // }

  var db = modules.oData;
  var functions = modules.oFunctions;
  var body = request.body;

  db.find({
    'table': 'task',
    'where': {
      'title': '测试通过接口发布任务'
    }
  }, function(err, data){
    data = JSON.parse(data).results;
    for(var i=0; i<data.length; i++){
      db.remove({
        'table': 'task',
        'objectId': data[i].objectId
      },function(err, data){
        response.send(data)
      })
    }
  })

}
exports.deleteTask = onRequest;