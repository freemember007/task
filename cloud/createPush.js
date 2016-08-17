function onRequest(request, response, modules) {

  var db = modules.oData;
  var http = modules.oHttp;
  var body = request.body;

  var task = {
    objectId: body.objectId,
    company: body.company,
    assignerId: body.assigner,
    assignerName: '',
    assigneeId: body.assignee,
    assigneeName: '',
    title: body.title,
    costHours: body.costHours,
    // status: body.status
  };
  var deadline = new Date((body.deadline).replace(/-/g, '/'));
  task.deadline = (deadline.getMonth() + 1) + '月' + deadline.getDate() + '日';

  var message = {
    'msg_content': '',
    'content_type': 'text',
    'title': '',
    'extras': {
      'assignee': task.assigneeId,
      'status': body.status
    }
  };

  // 查询指派人姓名头像
  db.findOne({
    'table': '_User',
    // 'keys': 'name,avatar',
    'objectId': task.assignerId
  }, function(err, data) {
    data = JSON.parse(data);
    task.assignerName = data.name; //不变
    if(data.avatar.url && data.avatar.url.indexOf('http') === -1){
      task.assignerAvatar = 'http://file.bmob.cn/' + data.avatar.url;
    }else{
      task.assignerAvatar = data.avatar.url;
    }
    // task.assignerAvatar = 'http://file.bmob.cn/' + data.avatar.url;
    // 查询负责人姓名
    db.findOne({
      'table': '_User',
      'keys': 'name',
      'objectId': task.assigneeId
    }, function(err, data) {
      task.assigneeName = JSON.parse(data).name; //会变
      // 查询teamleader
      db.find({
        'table': 'team',
        'keys': 'leader',
        'where': { 'members': task.assigneeId, 'company': task.company }
      }, function(err, data) {
        var team = JSON.parse(data).results && JSON.parse(data).results[0];
        //1. 如果负责人是普通成员
        if (task.assigneeId !== team.leader.objectId) {
          //1.1 如果指派人是自己, push leader
          if (task.assignerId === task.assigneeId) {
            task.assigneeName = '自己';
            push(team.leader.objectId, message);
          //1.2 如果指派人是他人
          } else {
            //1.2.1 且指派人不是leader, push leader
            if (task.assignerId !== team.leader.objectId) {
              push(team.leader.objectId, message);
            }
            //1.2.2 push 自己
            task.assigneeName = '你';
            push(task.assigneeId, message);
          }
        // 2. 如果负责人是leader
        } else {
          db.findOne({
            'table': 'company',
            'keys': 'boss',
            'objectId': task.company
          }, function(err, data){
            data = JSON.parse(data);
            //2.1 如果指派人是自己，push boss
            if (task.assignerId === task.assigneeId) {
              task.assigneeName = '自己';
              push(data.boss.objectId, message);
            //2.2 如果指派人是他人
            }else{
              // 且指派人不是老板，push boss
              if(task.assignerId !== data.boss.objectId){
                push(data.boss.objectId, message);
              }
              // push自己
              task.assigneeName = '你';
              push(task.assigneeId, message);
            }
          })

        }
      })
    })
  });

  function push(userId, message) {
    message.msg_content = task.assignerName + '给' + task.assigneeName + '创建了新工作：' +
                          task.title + '，截止时间：' + task.deadline + '，工作量：' + task.costHours + '小时。';
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
    };

    // 将通知内容插入数据库
    db.insert({
      'table': 'notification',
      'data': {
        'userId': userId,
        'updaterAvatar': task.assignerAvatar,
        'updaterName': task.assignerName,
        'message': message.msg_content,
        'assigneeId': task.assigneeId,
        'taskStatus': parseInt(body.status), //明明是int，还要parse，bmob啥情况？
        'taskId': task.objectId,
        'isRead': false
      }
    }, function(err, data) {
      // response.send(data||err)
      sendSms(userId);
    });

    // 短信发送
    function sendSms(userId){
      db.getUserByObjectId({
        'objectId': userId
      }, function(err, data) {
        var mobilePhoneNumber = JSON.parse(data).mobilePhoneNumber;
        // response.send(mobilePhoneNumber);
        http.post({
          url: 'http://node.diandianys.com/api/sms',
          headers: {
            'Content-Type': 'application/json' //这个必须有
          },
          body: JSON.stringify({
            sms_param: {
              'assignerName': task.assignerName, //待修改
              'assigneeName': task.assigneeName, //待修改
              title: task.title,
              deadline: task.deadline,
              costHours: task.costHours
            },
            rec_num: mobilePhoneNumber,
            sms_template_code: 'SMS_11515421'
          })
        }, function(error, res, body) {
          if (!error && res.statusCode == 200) {
            response.send(body);
          } else {
            response.send(res.statusCode);
          }
        });
      });
    }



    // 极光推送
    db.find({
      'table': 'devices',
      'keys': 'pushId',
      'where': {'userId': userId}
    }, function(err, data) {
      // response.send(data) // 为什么有时为空？
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
exports.createPush = onRequest;