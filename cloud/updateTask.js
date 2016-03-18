function onRequest(request, response, modules) {

  // 请求PostBody示例，没有值的字段请不要传！
  // {
  //   'objectId': '7cc5bff2e7', //必须
  //   'title': '测试通过接口更新任务',
  //   'team': 'vIJB0003',
  //   'assignee': '8DRM999C',
  //   'costHours': 4,
  //   'priority': 3,
  //   'status': 3,
  //   'project': { 'color': '#FF666666', 'name': '点点医院-微信' },
  //   'file': {
  //     '__type': 'File',
  //     'filename': '1457932579348.png',
  //     'group': 'group1',
  //     'url': 'M03/E0/DF/oYYBAFbmSSmAJMEgAAKg1zYPZTU216.png'
  //   },
  //   'deadline': '2016-03-09 00:00:00',
  //   'follower': {'action': 'AddRelation' ,'objectId': 'EuGz444d'}, //AddRelation加关注，RemoveRelation取消关注
  //   'comment': {
  //     'userName': '肖江平',
  //     'userUrl': 'http://file.bmob.cn/M03/AB/6F/oYYBAFbKrFOASa63AAAyn1JM9O4332.png',
  //     'sendTimg': '2016-03-14 14:27:58',
  //     'userId': 'EuGz444d',
  //     'userMsg': '哈哈'
  //   }
  // }


  var db = modules.oData;
  var rel = modules.oRelation;
  var arr = modules.oArray
  var functions = modules.oFunctions;
  var ep = modules.oEvent;
  var body = request.body;
  var baseJson = {};
  var relJson = {};
  var arrJson = {};


  // 构建基本数据baseJson
  for (var k in body) baseJson[k] = body[k];
  delete baseJson._e;
  delete baseJson.objectId;
  delete baseJson.team;
  delete baseJson.assignee;
  delete baseJson.file;
  delete baseJson.follower;
  delete baseJson.comment;
  if (baseJson.priority) baseJson.priority = parseInt(baseJson.priority);
  if (baseJson.status) baseJson.status = parseInt(baseJson.status);
  if (baseJson.costHours) baseJson.costHours = parseInt(baseJson.costHours);
  if (baseJson.project) baseJson.project = JSON.parse(baseJson.project);
  if (baseJson.deadline) {
    baseJson.deadline = {
      '__type': 'Date',
      'iso': baseJson.deadline
    };
  } else {
    delete baseJson.deadline //删除可能传来的空值
  }


  // 构建关系数据relJson
  if (body.team) relJson.team = { '__type': 'Pointer', 'className': 'team', 'objectId': body.team };
  if (body.team) relJson.assignee = { '__type': 'Pointer', 'className': '_User', 'objectId': body.assignee };
  if (body.file) relJson.file = JSON.parse(body.file);
  if (body.follower) {
    var follower = JSON.parse(body.follower);
    relJson.followers = { '__op': follower.action, 'objects': [{ '__type': 'Pointer', 'className': '_User', 'objectId': follower.objectId }] };
  }


  // 构建数组数据arrJson
  if (body.comment) arrJson = { 'comments': { '__op': 'AddUnique', 'objects': [JSON.parse(body.comment)] } };


  //更新基本数据
  db.update({
    'table': 'task',
    'objectId': body.objectId,
    'data': baseJson
  }, function(err, data) {
    response.send(data)
  });


  //更新关系数据
  rel.update({
    'table': 'task',
    'objectId': body.objectId,
    'data': relJson
  }, function(err, data) {
    response.send(data)
  })


  //更新数组数据
  arr.addUnique({
    'table': 'task',
    'objectId': body.objectId,
    'data': arrJson
  }, function(err, data) {
    functions.run({
      'name': 'pushComment',
      'data': {
        'objectId': body.objectId,
        'status': body.status,
        'comment': body.comment
      }
    }, function(err, data) {
      //回调函数
      // response.send(data)
    });
    response.send(data)
  })


}
exports.updateTask = onRequest;