function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var http = modules.oHttp;


  var task = { // 推送涉及的任务
    'objectId': request.body.objectId,
  };
  var update = { // 任务更新事项
    'userId': request.body.updaterId
  };
  // var assigneeDisplayName = ''; // 任务负责人个性化展示名
  var message = { // 要推送的消息体
    'msg_content': '',
    'content_type': 'text',
    'title': '',
    'extras': {
      'assignee': '',
      'taskId': request.body.objectId, //totest
      // 'status': 1 
    }
  };
  var priorityDict = ['不紧急', '一般', '紧急', '非常紧急'];
  var statusDict = ['暂停了', '启动了', '完成了', '搁置了', '删除了'];
  var progressDict = ['0%', '25%', '50%', '75%'];
  var costHoursDict = {
    '0': '0小时',
    '2': '2小时',
    '4': '0.5天',
    '8': '1天',
    '12': '1.5天',
    '16': '2天',
    '20': '2.5天',
    '24': '3天',
    '32': '4天',
    '40': '5天'
  };

  // 查询task信息
  rel.query({
    'table': 'task',
    'include': 'assigner,assignee,company,company.boss,team,team.leader', //关联查询
    'where': {'objectId': task.objectId}
  }, function (err, data) {
    // response.send(data)
    data = JSON.parse(data).results[0];
    taskObj = data; //原始对象,以备后用
    task.title = data.title;
    task.assignerId = data.assigner.objectId;
    task.assignerName = data.assigner.name; //不变
    task.assigneeId = data.assignee.objectId;
    message.extras.assignee = data.assignee.objectId; //这是初始值，如果转派给其他人，将会改变
    task.assigneeName = data.assignee.name; //不变
    task.leaderId = data.team.leader.objectId;
    task.bossId = data.company.boss.objectId;
    task.status = parseInt(data.status);
    message.extras.status = parseInt(data.status); // 这是初始值，如果改状态了，要相应改变
    task.priority = parseInt(data.priority);
    task.costHours = data.costHours || '0';
    task.followers = data.followers || [];
    task.projectName = data.project.name;
    if (data.deadline) {
      var deadline = new Date((data.deadline.iso).replace(/-/g, '/'));
      task.deadline = (deadline.getMonth() + 1) + '月' + deadline.getDate() + '日';
    } else {
      task.deadline = '无期限'
    }
    //确定责任人的上司Id
    if (task.assigneeId === task.bossId) {
      task.superiorId = ''//boss没有上司
    } else {
      task.superiorId = (task.assigneeId !== task.leaderId) ? task.leaderId : task.bossId;
    }

    // 推送给关注者
    for (var i = 0; i < task.followers.length; i++) {
      if (task.followers[i] !== update.userId) { //如果不是关注者不是更新者
        push(task.followers[i], '你关注的' + task.assigneeName + '的')//通知关注者
      }
    }

    // 推送给评论被@人
    if (request.body.comment) {
      var comment = JSON.parse(request.body.comment) || {};
      if (comment.atId) {
        push(comment.atId, task.assigneeName);
      }
    }

    // 如果更新内容是完成任务,检查任务人是否还是进行中任务,如果没有,发短信给上司
    if (request.body.status == '2') {
      rel.query({
        'table': 'task',
        'where': {
          assignee: taskObj.assignee.objectId,
          "status": 1
        },
        'limit': 0,
        'count': 1
      }, function (err, data) {
        data = JSON.parse(data);
        // response.send(data)
        if(taskObj.assignee.objectId == taskObj.team.leader.objectId){ //如果是leader
          var rec_num = taskObj.company.boss.mobilePhoneNumber;
        }else{
          var rec_num = taskObj.team.leader.mobilePhoneNumber;
        }
        if (data.count < 2) { //当没有任务时,实际应该为1,因为是先推送了再写数据库
          sendSms({
            sms_param: {
              name: taskObj.assignee.name,
              percent: '0%',
            },
            rec_num: rec_num,
            sms_template_code: 'SMS_12185399'
          })
        }
      });
    }


    // 推送给非关注者
    // 注意：
    // 1.为方便理解，这里的“自己”准确地说是指“责任人”
    // 2.涉及到任务被转派时，需要在具体推送时再判断还要推送哪些人。

    // 如果更新人是自己
    if (update.userId === task.assigneeId) {
      if (task.assignerId === task.assigneeId) {//如果指派人是自己
        if (task.superiorId) {//如果有上司(即不是老板)
          //assigneeDisplayName = '他的';
          push(task.superiorId, '他的')//通知上司
        }
      } else if (task.assignerId === task.superiorId) {//如果指派人是上司
        //assigneeDisplayName = '你指派给他的';
        push(task.superiorId, '你指派给他的')//通知指派人兼上司
      } else {//如果指派人是其他人
        //assigneeDisplayName = '你指派给他的';
        push(task.assignerId, '你指派给他的')//通知指派人
        //assigneeDisplayName = '他的';
        push(task.superiorId, '他的')//通知上司
      }
      // 如果更新人是指派人
    } else if (update.userId === task.assignerId) {
      if (task.assignerId === task.assigneeId) {//如果指派人是自己
        if (task.superiorId) {//如果有上司(即不是老板)
          //assigneeDisplayName = '他的';
          push(task.superiorId, '他的')//通知上司
        }
      } else if (task.assignerId === task.superiorId) {//如果指派人是上司
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      } else {//如果指派人是其他人
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
        if (task.superiorId) {//如果有上司(即不是老板)
          //assigneeDisplayName = '他指派给' + task.assigneeName  + '的';
          push(task.superiorId, '他指派给' + task.assigneeName + '的')//通知上司
        }
      }
      // 如果更新人是上司
    } else if (update.userId === task.superiorId) {
      if (task.assignerId === task.assigneeId) {//如果指派人是自己
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      } else if (task.assignerId === task.superiorId) {//如果指派人是上司
        //assigneeDisplayName = "你的";
        push(task.assigneeId, '你的')//通知自己
      } else {//如果指派人是其他人
        //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
        push(task.assignerId, '你指派给' + task.assigneeName + '的')//通知指派人
        //assigneeDisplayName = "你的";
        push(task.assigneeId, "你的")//通知自己
      }
      // 如果更新人是其他人
    } else {
      if (task.assignerId === task.assigneeId) {//如果指派人是自己
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      } else if (task.assignerId === task.superiorId) {//如果指派人是上司
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
        //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
        push(task.assignerId, '你指派给' + task.assigneeName + '的')//通知指派人兼上司
      } else {//如果指派人是其他人
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
        if (update.userId !== task.assignerId) {
          //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
          push(task.assignerId, '你指派给' + task.assigneeName + '的')//通知指派人
        }
      }
    }

  })

  function push(userId, assigneeDisplayName) {

    // 查询更新人姓名
    db.findOne({
      'table': '_User',
      'objectId': update.userId
    }, function (err, data) {
      data = JSON.parse(data);
      update.userName = data.name; // 查出更新人姓名
      if (data.avatar.url && data.avatar.url.indexOf('http') === -1) {
        update.userAvatar = 'http://file.bmob.cn/' + data.avatar.url;
      } else {
        update.userAvatar = data.avatar.url;
      }
      // 修改标题推送
      if (request.body.title && request.body.title !== task.title) {
        message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
          '>标题改为：' + request.body.title;
        doPush(userId)
      }
      // 任务转派推送
      if (request.body.assignee && request.body.assignee !== task.assigneeId) {
        message.extras.assignee = request.body.assignee;
        db.findOne({
          'table': '_User',
          'objectId': request.body.assignee
        }, function (err, data) {
          data = JSON.parse(data);
          message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
            '>转派给了' + data.name;
          doPush(userId);
        });
        if (request.body.assignee !== update.userId) { //如果被转派人给更新人自己，通知被转派人
          message.msg_content = update.userName + '将' + (task.assigneeName === update.userName ? '他的' : task.assigneeName) + '的工作<' + task.title +
            '>转派给了你';
          doPush(request.body.assignee);
        }
      }
      // 工作量修改推送
      if (request.body.costHours && request.body.costHours != task.costHours) { // 可能类型不同，故使用非严格等于
        message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
          '>的工作量由' + costHoursDict[task.costHours] + '改为' + costHoursDict[request.body.costHours];
        doPush(userId)
      }
      // 优先级修改推送
      if (request.body.priority && request.body.priority != task.priority) { // 可能类型不同，故使用非严格等于
        message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
          '>的优先级由' + priorityDict[parseInt(task.priority)] + '改为' + priorityDict[parseInt(request.body.priority)];
        doPush(userId)
      }
      // 状态修改推送
      // if(request.body.status && request.body.status != task.status && request.body.status != 1){ //重启怎办？
      if (request.body.status && request.body.status != task.status) {
        message.extras.status = parseInt(request.body.status);
        message.msg_content = update.userName + statusDict[parseInt(request.body.status)] + assigneeDisplayName + '工作<' + task.title +
          '>';
        doPush(userId)
      }
      // 项目修改推送
      if (request.body.project && JSON.parse(request.body.project).name != task.projectName) {

        message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
          '>的项目改为：' + JSON.parse(request.body.project).name;
        doPush(userId)
      }
      // 进度更新推送
      if (request.body.progress) {

        message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
          '>的进度更新为：' + progressDict[request.body.progress];
        doPush(userId)
      }
      // 关注推送
      if (request.body.follower) {
        message.msg_content = update.userName + (JSON.parse(request.body.follower).action === 'AddUnique' ? '关注了' : '取消关注了') + assigneeDisplayName + '工作<' + task.title +
          '>';
        doPush(userId)
      }
      // 点赞推送
      if (request.body.liker) {
        if (JSON.parse(request.body.liker).action === 'AddUnique') {
          message.msg_content = update.userName + '觉得' + assigneeDisplayName + '工作<' + task.title +
            '>完成得挺赞的。';
        } else {
          message.msg_content = update.userName + '取消了对' + assigneeDisplayName + '工作<' + task.title +
            '>的点赞。';
        }
        doPush(userId)
      }
      // 评论推送
      if (request.body.comment) {
        var comment = JSON.parse(request.body.comment) || {};
        message.msg_content = update.userName + '评论了' + assigneeDisplayName + '工作<' + task.title +
          '>：' + comment.userMsg;
        doPush(userId, assigneeDisplayName); // 加assigneeDisplayName参数给短信通知时用
        if (comment.atId) {
          message.msg_content = update.userName + '在对' + assigneeDisplayName + '的工作<' + task.title +
            '>' + '的评论中@了你。';
          doPush(userId);
        }
      }
      // 截止时间推送
      if (request.body.deadline) {
        var deadline = new Date((request.body.deadline).replace(/-/g, '/'));
        update.deadline = (deadline.getMonth() + 1) + '月' + deadline.getDate() + '日';
        if (update.deadline != task.deadline) {
          message.msg_content = update.userName + '将' + assigneeDisplayName + '工作<' + task.title +
            '>的截止时间由' + task.deadline + '改为' + update.deadline;
          doPush(userId)
        }
      }
      // leader评价推送
      if (request.body.value) {
        message.msg_content = update.userName + '给' + assigneeDisplayName + '工作<' + task.title +
          '>评了' + request.body.value + '星, 评价理由: ' + (request.body.valueReason || '暂无');
        doPush(userId)
      }
    })

  }

  function doPush(userId, assigneeDisplayName) {

    //推送消息体
    var pushBody = {
      'platform': ['android'],
      'audience': {'registration_id': []},
      'notification': {
        'android': {
          'alert': message.msg_content,
          "extras": {
            'assignee': message.extras.assignee,
            'status': message.extras.status,
            'taskId': message.extras.taskId //totest
          }
        }
      },
      'message': message
    };

    //使用安全字符
    message.msg_content.replace(/\</g, '&#60;').replace(/\>/g, '&#62;');

    //将提醒信息插入数据库
    db.insert({
      'table': 'notification',
      'data': {
        'userId': userId,
        'updaterAvatar': update.userAvatar,
        'updaterName': update.userName,
        'message': message.msg_content,
        'assigneeId': message.extras.assignee,
        'taskStatus': message.extras.status, //这个是新状态 task.status为老状态
        'taskId': message.extras.taskId,
        'isRead': false
      }
    }, function (err, data) {
      // response.send(data); //为什么保存的message.msg_content是乱码？
      // todo: 逻辑有点乱, 评论发短信应该从这里抽出来
      if (request.body.comment){
        var comment = JSON.parse(request.body.comment) || {};
        db.getUserByObjectId({
          'objectId': userId
        }, function (err, data) {
          var mobilePhoneNumber = JSON.parse(data).mobilePhoneNumber;
          sendSms({
            sms_param: {
              leaderName: update.userName,
              assigneeName: assigneeDisplayName,
              title: task.title,
              grade: comment.userMsg
            },
            rec_num: mobilePhoneNumber,
            sms_template_code: 'SMS_12290177'
          })
        });
      };
    });

    // 极光推送
    db.find({
      'table': 'devices',
      'keys': 'pushId',
      'where': {'userId': userId}
    }, function (err, data) {
      var pushId = JSON.parse(data).results[0].pushId; // 假定推送人已存在，后面考虑可能不存在的情况
      pushBody.audience.registration_id.push(pushId);
      var options = {
        url: 'https://api.jpush.cn/v3/push',
        headers: {
          'Authorization': 'Basic N2FkNTFmMGM5ODYzMDNkODU4NzNmZTk4OmU4NjA5MGVlMGI0OWRhNzBkMzU2Nzk2Yw==',
        },
        body: JSON.stringify(pushBody)
      };
      http.post(options, function (error, res, body) {

        if (!error && res.statusCode == 200) {
          response.send(body);
        } else {
          response.send(res.statusCode);
        }
      })
    })

  }

  // 发送短信
  function sendSms(params) {
    http.post({
      url: 'http://node.diandianys.com/api/sms',
      headers: {
        'Content-Type': 'application/json' //这个必须有
      },
      body: JSON.stringify(params)
    }, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        response.send(body);
      } else {
        response.send(res.statusCode);
      }
    });
  }


}
exports.updatePush = onRequest;