function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var http = modules.oHttp;

  
  var task = { // 推送涉及的任务
    'objectId': request.body.objectId,
  };
  var taskUpdate = { // 任务更新事项
    'updaterId': request.body.updaterId
  };
  // var assigneeDisplayName = ''; // 任务负责人个性化展示名
  var message = { // 要推送的消息体
    'msg_content': '',
    'content_type': 'text',
    'title': '',
    'extras': {
      'assignee': '', 
      // 'status': 1 
    }
  }
  var priorityDict = ['不紧急', '一般', '紧急', '非常紧急'];
  var statusDict = ['暂停了', '开始了', '完成了', '搁置了'];
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
  }

  // 查询task信息
  rel.query({
    'table': 'task',
    'include': 'assigner,assignee,company,team', //关联查询
    'where': {'objectId': task.objectId}
  }, function(err, data) {
    data = JSON.parse(data).results[0];
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
    task.projectName = data.project.name;
    if(data.deadline){
      var deadline = new Date((data.deadline.iso).replace(/-/g, '/'));
      task.deadline = (deadline.getMonth() + 1) + '月' + deadline.getDate() + '日';
    }else{
      task.deadline = '无期限'
    }
    //确定责任人的上司Id
    if(task.assigneeId === task.bossId){
      task.superiorId = ''//boss没有上司
    }else{
      task.superiorId = (task.assigneeId !== task.leaderId) ? task.leaderId: task.bossId;
    }

    // 推送给关注者
    rel.query({
      'table': '_User',
      'keys': 'objectId',
      'where': { '$relatedTo': { 'object': { '__type': 'Pointer', 'className': 'task', 'objectId': task.objectId }, 'key': 'followers' } }
    }, function(err, data){
      data = JSON.parse(data).results;
      for(var i = 0; i< data.length; i++){
        if(data.objectId !== taskUpdate.updaterId){ //如果不是关注者不是更新者
          //assigneeDisplayName = '你关注的'; //其值可能会受异步影响而变化，后续检查
          push(data[i].objectId, '你关注的')//通知关注者
        }
      }
    })

    // 推送给非关注者
    // 注意：
    // 1.为方便理解，这里的“自己”准确地说是指“责任人”
    // 2.涉及到任务被转派时，需要在具体推送时再判断还要推送哪些人。

    // 如果更新人是自己
    if(taskUpdate.updaterId === task.assigneeId){
      if(task.assignerId === task.assigneeId){//如果指派人是自己
        if(task.superiorId){//如果有上司(即不是老板)
          //assigneeDisplayName = '他的';
          push(task.superiorId, '他的')//通知上司
        }
      }else if(task.assignerId === task.superiorId){//如果指派人是上司
        //assigneeDisplayName = '你指派给他的';
        push(task.superiorId, '你指派给他的')//通知指派人兼上司
      }else{//如果指派人是其他人
        //assigneeDisplayName = '你指派给他的';
        push(task.assignerId, '你指派给他的')//通知指派人
        //assigneeDisplayName = '他的';
        push(task.superiorId, '他的')//通知上司
      }
    // 如果更新人是指派人
    }else if(taskUpdate.updaterId === task.assignerId){
      if(task.assignerId === task.assigneeId){//如果指派人是自己
        if(task.superiorId){//如果有上司(即不是老板)
          //assigneeDisplayName = '他的';
          push(task.superiorId, '他的')//通知上司
        }
      }else if(task.assignerId === task.superiorId){//如果指派人是上司
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      }else{//如果指派人是其他人
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
        if(task.superiorId){//如果有上司(即不是老板)
          //assigneeDisplayName = '他指派给' + task.assigneeName  + '的';
          push(task.superiorId, '他指派给' + task.assigneeName  + '的')//通知上司
        }
      }
    // 如果更新人是上司
    }else if(taskUpdate.updaterId === task.superiorId){
      if(task.assignerId === task.assigneeId){//如果指派人是自己
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      }else if(task.assignerId === task.superiorId){//如果指派人是上司
        //assigneeDisplayName = "你的";
        push(task.assigneeId, '你的')//通知自己
      }else{//如果指派人是其他人
        //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
        push(task.assignerId, "你指派给"+ task.assigneeName  + '的')//通知指派人
        //assigneeDisplayName = "你的";
        push(task.assigneeId, "你的")//通知自己
      }
    // 如果更新人是其他人
    }else{
      if(task.assignerId === task.assigneeId){//如果指派人是自己
        //assigneeDisplayName = '你的';
        push(task.assigneeId, '你的')//通知自己
      }else if(task.assignerId === task.superiorId){//如果指派人是上司
        //assigneeDisplayName = "你的";
        push(task.assigneeId, "你的")//通知自己
        //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
        push(task.assignerId, "你指派给"+ task.assigneeName  + '的')//通知指派人兼上司
      }else{//如果指派人是其他人
        //assigneeDisplayName = "你的";
        push(task.assigneeId, "你的")//通知自己
        if(taskUpdate.updaterId !== task.assignerId){
          //assigneeDisplayName = "你指派给"+ task.assigneeName  + '的';
          push(task.assignerId, "你指派给"+ task.assigneeName  + '的')//通知指派人
        }
      }
    }

  })

  function push(userId, assigneeDisplayName){

    // 查询更新人姓名
    db.findOne({
      'table': '_User',
      'objectId': request.body.updaterId
    },function(err, data){
      data = JSON.parse(data);
      taskUpdate.updaterName = data.name; // 查出更新人姓名
      if(request.body.title && request.body.title !== task.title){
        message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title + '>标题改为：' + request.body.title;
        doPush(userId)
      }
      if(request.body.assignee && request.body.assignee !== task.assigneeId){
        message.extras.assignee = request.body.assignee;
        db.findOne({
          'table': '_User',
          'objectId': request.body.assignee
        }, function(err, data){
          data = JSON.parse(data);
          message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title + '>转派给了' + data.name;
          doPush(userId);
        })
        if(request.body.assignee !== taskUpdate.updaterId){ //如果被转派人给更新人自己，通知被转派人
          message.msg_content = taskUpdate.updaterName + '将' + (task.assigneeName === taskUpdate.updaterName ? '他的' : task.assigneeName) + '的任务<' + task.title + '>转派给了你'; 
          doPush(request.body.assignee); 
        }
      }
      if(request.body.costHours && request.body.costHours != task.costHours){ // 可能类型不同，故使用非严格等于
        message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title +
                              '>的工作量由' + costHoursDict[task.costHours] + '改为' + costHoursDict[request.body.costHours];
        doPush(userId)
      }
      if(request.body.priority && request.body.priority != task.priority){ // 可能类型不同，故使用非严格等于
        message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title +
                              '>的优先级由' + priorityDict[parseInt(task.priority)] + '改为' + priorityDict[parseInt(request.body.priority)];
        doPush(userId)
      }
      if(request.body.status && request.body.status != task.status && request.body.status != 1){
        message.extras.status = parseInt(request.body.status);
        message.msg_content = taskUpdate.updaterName + statusDict[parseInt(request.body.status)] + assigneeDisplayName + '任务<' + task.title + '>';
        doPush(userId)
      }
      if(request.body.project && JSON.parse(request.body.project).name != task.projectName){

        message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title +
                              '>的项目改为：' + JSON.parse(request.body.project).name;
        doPush(userId)
      }
      if(request.body.follower){
        message.msg_content = taskUpdate.updaterName + (JSON.parse(request.body.follower).action === 'AddRelation' ? '关注了' : '取消关注了') + assigneeDisplayName + '任务<' + task.title +
                              '>';
        doPush(userId)
      }
      if(request.body.comment){
        message.msg_content = taskUpdate.updaterName + '评论了' + assigneeDisplayName + '任务<' + task.title +
                              '>：' + JSON.parse(request.body.comment).userMsg;
        doPush(userId)
      }
      if(request.body.deadline){
        var deadline = new Date((request.body.deadline).replace(/-/g, '/'));
        taskUpdate.deadline = (deadline.getMonth() + 1) + '月' + deadline.getDate() + '日';
        if(taskUpdate.deadline != task.deadline){
          message.msg_content = taskUpdate.updaterName + '将' + assigneeDisplayName + '任务<' + task.title +
                              '>的截止时间由' + task.deadline + '改为' + taskUpdate.deadline;
          doPush(userId)
        }
        
      }
    })
    
  }

  function doPush(userId) {
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