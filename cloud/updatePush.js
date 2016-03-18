function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var http = modules.oHttp;
  var body = request.body;

  var task = {
    objectId: body.objectId,
  }

  var message = {
    'msg_content': '',
    'content_type': 'text',
    'title': '',
    'extras': {
      'assignee': '',
      'status': ''
    }
  }


  // 查询任务相关信息
  db.findOne({
    'table': 'task',
    'objectId': task.objectId
  }, function(err, data) {
    var data = JSON.parse(data);
    task.title = data.title; //
    task.assignerId = data.assigner.objectId;
    task.assigneeId = data.assignee.objectId;
    task.teamId = data.team.objectId;
    task.status = data.status;

    // 查询责任人信息
    db.findOne({
      'table': '_User',
      'objectId': task.assigneeId
    }, function(err, data) {
      var data = JSON.parse(data);
      task.assigneeName = data.name; //
      
      // 完成任务推送
      if (body.status && parseInt(body.status) === 2) {
        message.msg_content = task.assigneeName + '完成了任务：' + task.title;
        message.title = '完成任务提醒';
        message.extras = {
          'assignee': task.assigneeId,
          'status': 2,
        }
        // 通知指派人
        if (task.assignerId !== task.assigneeId) {
          push(task.assignerId, message)
        }
        // 通知leader
        db.findOne({
          'table': 'team',
          'objectId': task.teamId
        }, function(err, data) {
          var data = JSON.parse(data);
          task.teamleaderId = data.leader.objectId;
          if(task.teamleaderId !== task.assignerId && task.teamleaderId !== task.assigneeId ){
            push(task.teamleaderId, message)
          }
        })

      }

      // 评论推送
      if(body.comment && body.comment.userName !== task.assigneeName ) {
        body.comment = JSON.parse(body.comment)
        message.msg_content = body.comment.userName + '评论了你的任务：' + task.title;
        message.title = '评论提醒';
        message.extras = {
          'assignee': task.assigneeId,
          'status': task.status,
        }
        push(task.assigneeId, message)
      }

    })

  });



  function push(userId, message) {

    var pushBody = {
      'platform': ['android'],
      'audience': { 'registration_id': [] },
      'notification': {
        'android': {
          'alert': message.msg_content,
          "extras": {
            'assignee': message.extras.assignee,
            'status': message.extras.status
          }
        }
      },
      'message': message
    }

    db.find({
      'table': 'devices',
      'keys': 'pushId',
      'where': { 'userId': userId }
    }, function(err, data) {
      var pushId = JSON.parse(data).results[0].pushId; // 假定推送人已存在，后面考虑可能不存在的情况
      pushBody.audience.registration_id.push(pushId);
      var options = {
        url: 'https://api.jpush.cn/v3/push',
        headers: {
          'Authorization': 'Basic N2FkNTFmMGM5ODYzMDNkODU4NzNmZTk4OmU4NjA5MGVlMGI0OWRhNzBkMzU2Nzk2Yw==',
        },
        body: JSON.stringify(pushBody)
      };
      http.post(options, function(error, res, body) {

        if (!error && res.statusCode == 200) {
          response.send(body);
        } else {
          response.send(res.statusCode);
        }
      })
    })

  }




}
exports.updatePush = onRequest;