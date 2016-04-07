function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'taskId': '4e20f3d7c8' //任务ID
  // }

  var rel = modules.oRelation;


  rel.query({
    'table': 'task',
    'where': { 'objectId': request.body.taskId},
    'include': 'assignee,assigner,file',
    // 'limit': 1
  }, function(err, data) {
    data = JSON.parse(data).results[0];
    data.checklist = JSON.parse(data.checklist||'[]');
    response.send(data)
  })


}
exports.taskDetail = onRequest;