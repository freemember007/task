function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   ""companyId": "KbP15556",  //用户所在公司
  //   "userId": "HnKEgYYg" //用户ID
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var ep = modules.oEvent;
  var companyId = request.body.companyId;
  var userId = request.body.userId;
  var userTeamId;
  var startTime = new Date();

  var mySummary = [
    { 'title': '我负责的', 'field': 'assignee', 'delayNum': 0, 'allNum': 0 },
    { 'title': '我托付的', 'field': 'assigner', 'delayNum': 0, 'allNum': 0 },
    { 'title': '我关注的', 'field': 'followers', 'delayNum': 0, 'allNum': 0 },
  ];
  var teamSummary = [];

  // 获取当前用户所属团队
  rel.query({
    'table': 'team',
    'keys': 'name, objectId',
    'where': { 'members': userId }
  }, function(err, data) {
    var team = JSON.parse(data).results && JSON.parse(data).results[0];
    userTeamId = team.objectId;
    ep.emit('queryUserTeam');
  })




  //查跟我相关的任务数量 
  ep.once('queryUserTeam', function() {
    rel.query({
      'table': 'task',
      'where': { 'company': companyId, $or: [{ 'assignee': userId }, { 'assigner': userId }, { 'followers': userId }], 'status': { $in: [0, 1] } },
      'keys': 'assignee,assigner,deadline',
      'count': 1,
    }, function(err, data) {
      var result = JSON.parse(data); 
      var tasks = result.results;
      for (var i = 0; i < tasks.length; i++) {
        var assignee = tasks[i].assignee.objectId;
        var assigner = tasks[i].assigner.objectId;
        if (assignee === userId) mySummary[0].allNum++;
        if (assignee === userId && isDelay(tasks[i].deadline)) mySummary[0].delayNum++;
        if (assigner === userId && assignee !== userId) mySummary[1].allNum++;
        if (assigner === userId && assignee !== userId && isDelay(tasks[i].deadline)) mySummary[1].delayNum++;
        //以下数据准确的前提：前端要限制关注自己托付的工作 (另外逻辑上，leader不能关注自己团队的任务)
        if (assigner !== userId && assignee !== userId) mySummary[2].allNum++; 
        if (assigner !== userId && assignee !== userId && isDelay(tasks[i].deadline)) mySummary[2].delayNum++;
      }
      ep.emit('queryMySummary');
    })
  });

  //日期delay判断helper
  function isDelay(deadline) {
    var now = new Date();
    if (deadline && deadline.iso) {
      deadline = new Date(deadline.iso.replace(/-/g, '/'));
      if (now.getMonth() > deadline.getMonth()) {
        return true;
      } else if (now.getDate() > deadline.getDate()) {
        return true;
      } else {
        return false;
      }
    }
  }

  // 获取公司下所有团队及成员
  ep.once('queryMySummary', function() {
    rel.query({
      'table': 'team',
      'keys': 'name,objectId',
      "where": { 'company': companyId }
    }, function(err, data) {
      teamSummary = JSON.parse(data).results;

      // response.send(teamSummary)
      ep.after('queryTeamMembers', teamSummary.length, function(members) {
        // for (var i = 0; i < teamSummary.length; i++) {
        //   teamSummary[i].members = JSON.parse(members[i]).results;
        //   // 自己的团队排前
        //   if(teamSummary[i].objectId === userTeamId){
        //     var arr = teamSummary.splice(i, 1);
        //     teamSummary.unshift(arr[0])
        //   }
        // }
        for (var i = 0; i < teamSummary.length; i++) {
          teamSummary[i].members = JSON.parse(members[i]).results;
          delete teamSummary[i].createdAt;
          delete teamSummary[i].updatedAt;
          teamSummary[i].delayNum = 0;
          teamSummary[i].allNum = 0;
          for (var j = 0; j < teamSummary[i].members.length; j++) {
            delete teamSummary[i].members[j].createdAt;
            delete teamSummary[i].members[j].updatedAt;
            teamSummary[i].members[j].delayNum = 0;
            teamSummary[i].members[j].allNum = 0;
          }
          // 自己的团队排前，注意位置一定要放在最后面
          if(teamSummary[i].objectId === userTeamId){
            var arr = teamSummary.splice(i, 1);
            teamSummary.unshift(arr[0])
          }
        }
        ep.emit('queryTeamSummary')

      })

      for (var i = 0; i < teamSummary.length; i++) {
        rel.query({
          'table': '_User',
          'keys': 'username,name,avatar,objectId',
          'where': { "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": teamSummary[i].objectId }, "key": "members" } }
        }, ep.group('queryTeamMembers'))
      }

    })
  });


  //查询所有团队及成员的任务数量
  ep.once('queryTeamSummary', function() {
    rel.query({
      'table': 'task',
      'where': { 'company': companyId, 'status': { $in: [0, 1] } },
      "keys": 'team,assignee,deadline',
      'count': 1,
    }, function(err, data) {
      var result = JSON.parse(data);
      var tasks = result.results;

      for (var i = 0; i < tasks.length; i++) {
        for (var j = 0; j < teamSummary.length; j++) {
          // response.send(tasks[i])
          if (teamSummary[j].objectId === tasks[i].team.objectId) teamSummary[j].allNum++;
          if (teamSummary[j].objectId === tasks[i].team.objectId && isDelay(tasks[i].deadline)) teamSummary[j].delayNum++;
          for (var k = 0; k < teamSummary[j].members.length; k++) {
            if (teamSummary[j].members[k].objectId === tasks[i].assignee.objectId) teamSummary[j].members[k].allNum++;
            if (teamSummary[j].members[k].objectId === tasks[i].assignee.objectId && isDelay(tasks[i].deadline)) teamSummary[j].members[k].delayNum++;
          }
        }
      }
      response.send({
        'mySummary': mySummary,
        'teamSummary': teamSummary,
        '数据查询耗时': new Date() - startTime,
      })
    });
  });

}

exports.sidebar = onRequest;