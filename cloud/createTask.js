function onRequest(request, response, modules) {

  // 请求PostBody示例，没有值的字段请不要传！
  // {
  //   'title': '测试通过接口发布任务', //必须
  //   'company': 'KbP15556',//必须
  //   'team': 'vIJB0003',//必须
  //   'assigner': 'EuGz444d',//必须
  //   'assignee': '8DRM999C',//必须
  //   'costHours': 4,
  //   'priority': 1,
  //   'project': { "color": "#FF666666", "name": "点点医院-微信" },
  //   'file': { '__type': 'File', 'filename': 'Q20160301-0.png', 'group': 'group1', 'url': 'M03/D9/1F/oYYBAFbhCYiAeVzPAAKmJR5cJVM133.png' },
  //   'deadline': '2016-03-09 18:02:52'
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var functions = modules.oFunctions;
  var body = request.body;
  var baseJson = {};
  var relJson = {};


  // 构建基本数据baseJson
  for (var k in body) baseJson[k] = body[k];
  delete baseJson._e;
  delete baseJson.company;
  delete baseJson.team;
  delete baseJson.assigner;
  delete baseJson.assignee;
  delete baseJson.file;
  baseJson.priority = parseInt(baseJson.priority) || 0;
  baseJson.costHours = parseInt(baseJson.costHours) || 0;
  if (baseJson.deadline) {
    baseJson.deadline = {
      '__type': 'Date',
      'iso': baseJson.deadline
    };
    baseJson.status = 1;
  } else {
    baseJson.status = 0;
    delete baseJson.deadline //删除可能传来的空值
  }
  baseJson.project = JSON.parse(baseJson.project);

  // 构建关系数据relJson
  relJson = {
    'team': { '__type': 'Pointer', 'className': 'team', 'objectId': body.team },
    'company': { '__type': 'Pointer', 'className': 'company', 'objectId': body.company },
    'assigner': { '__type': 'Pointer', 'className': '_User', 'objectId': body.assigner },
    'assignee': { '__type': 'Pointer', 'className': '_User', 'objectId': body.assignee },
  }
  if (body.file) relJson.file = JSON.parse(body.file);

  // 保存基本数据
  db.insert({
    'table': 'task',
    'data': baseJson
  }, function(err, data) {
    var task = JSON.parse(data)
    saveRel(task);
  });

  // 保存关系数据
  function saveRel(task) {
    rel.update({
      'table': 'task',
      'objectId': task.objectId,
      'data': relJson
    }, function(err, data) {
      functions.run({
        'name': 'createPush',
        'data': {
          'title': body.title,
          'company': body.company,
          'team': body.team,
          'assigner': body.assigner,
          'assignee': body.assignee,
          'costHours': body.costHours,
          'deadline': body.deadline,
          'status': baseJson.status
        }
      }, function(err, data) {
        //回调函数
        // response.send(data)
      });
      response.send(task)
    })
  }

}
exports.createTask = onRequest;