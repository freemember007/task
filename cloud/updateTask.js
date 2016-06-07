function onRequest(request, response, modules) {

  // 云方法：<更新任务>
  // 输入示例&说明：(没有变更的字段最好不要传过来)
  // {
  //     'objectId': '4e20f3d7c8',
  //     'updaterId': '8DRM999C', //操作者ID
  //     'title': '电话问诊讨论', 
  //     'team': 'W98PFFFR',
  //     'assignee': 'EuGz444d', 
  //     'costHours': 4,
  //     'priority': 3,
  //     'status': 1,
  //     'project': {"color":"#FF666666","name":"点点医院-微信"},
  //     'progress': "1", // "0":进度0%; "1":进度25%; "2":进度50%, "3":进度75%
  //     'file': {'__type': 'File','filename': '1457932579348.png','group': 'group1','url': 'M03/E0/DF/oYYBAFbmSSmAJMEgAAKg1zYPZTU216.png'},
  //     'deadline': '2016-03-09 00:00:00',
  //     'follower': {'action': 'AddUnique' ,'userId': 'EuGz444d'}, // 添加：AddUnique，移除：Remove
  //     'liker': {'action': 'AddUnique' ,'objectId': 'EuGz444d'}, // 添加：AddUnique，移除：Remove
  //     'comment': {
  //       'userName': '肖江平',
  //       'userUrl': 'http://file.bmob.cn/M03/AB/6F/oYYBAFbKrFOASa63AAAyn1JM9O4332.png',
  //       'sendTimg': '2016-03-14 14:27:58',
  //       'userId': 'EuGz444d',
  //       'userMsg': '哈哈'
  //     }
  //   }

  var db = modules.oData;
  var rel = modules.oRelation;
  var arr = modules.oArray;
  var functions = modules.oFunctions;
  var ep = modules.oEvent;
  var body = request.body;
  delete body._e; //非常重要，否则后面会出错！！！
  var baseJson = {};
  var relJson = {};
  var arrJson = {};

  functions.run({
    'name': 'updatePush',
    'data': body //使用前删除body._e，否则会出错！！！
  }, function(err, data) {
    // response.send(data)

    //推送完了再更新任务
    // 构建基本数据baseJson
    for (var k in body) baseJson[k] = body[k];
    delete baseJson.objectId;
    delete baseJson.team;
    delete baseJson.assignee;
    delete baseJson.file;
    delete baseJson.follower;
    delete baseJson.liker;
    delete baseJson.comment;
    if (baseJson.priority) baseJson.priority = parseInt(baseJson.priority);
    if (baseJson.status) baseJson.status = parseInt(baseJson.status);
    if(baseJson.status == 2){
      baseJson.completedAt = new Date().getTime(); //存完成的时间戳，受不了bmob的时间格式了！
    }
    if (baseJson.costHours) baseJson.costHours = parseInt(baseJson.costHours);
    if (baseJson.project) baseJson.project = JSON.parse(baseJson.project);
    // if (baseJson.value) baseJson.valueObject = JSON.parse(baseJson.valueObject);
    if (baseJson.deadline) {
      baseJson.deadline = {
        '__type': 'Date',
        'iso': baseJson.deadline
      };
    } else {
      // delete baseJson.deadline //删除可能传来的空值或赋值为undefined均可
      baseJson.deadline = undefined; //todo:怎么清除时间？我简直要吐血了。
    }


    // 构建关系数据relJson
    if (body.team) relJson.team = { '__type': 'Pointer', 'className': 'team', 'objectId': body.team };
    if (body.assignee) relJson.assignee = { '__type': 'Pointer', 'className': '_User', 'objectId': body.assignee };
    if (body.file) relJson.file = JSON.parse(body.file);

    // 构建数组数据arrJson
    if (body.comment) arrJson.comments = { '__op': 'AddUnique', 'objects': [JSON.parse(body.comment)] };
    if (body.follower) {
      follower = JSON.parse(body.follower);
      arrJson.followers = { '__op': follower.action, 'objects': [follower.userId] };
    }
    if (body.liker) {
      liker = JSON.parse(body.liker);
      arrJson.likers = { '__op': liker.action, 'objects': [liker.userId]};
    }

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
      response.send(data)
    })


  });


}
exports.updateTask = onRequest;