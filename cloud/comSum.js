function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var companyId = request.body.companyId;
  var userId = request.body.userId;

  var arr = [
    { 'title': '我负责的', 'delayNum': 0, 'allNum': 0 },
    { 'title': '我托付的', 'delayNum': 0, 'allNum': 0 },
    { 'title': '我关注的', 'delayNum': 0, 'allNum': 0 },
  ];

  //查跟我相关的任务数量
  rel.query({
    'table': 'task',
    'where': { 'company': companyId, $or: [{ 'assignee': userId }, { 'assigner': userId }, { 'followers': userId }], 'status': { $in: [0, 1] } },
    'keys': 'assignee,assigner',
    'count': 1,
  }, function(err, data) {
    var result = JSON.parse(data);
    var tasks = result.results;
    // response.send(tasks)
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].assignee.objectId === userId) arr[0].allNum++;
      if (tasks[i].assigner.objectId === userId && tasks[i].assignee.objectId !== userId) arr[1].allNum++;
      if (tasks[i].assigner.objectId !== userId && tasks[i].assignee.objectId !== userId) arr[2].allNum++;
    }

  });

  //查公司下所有团队及其任务数量
  rel.query({
    'table': 'team',
    'keys': 'name, objectId',
    'where': { 'company': companyId },
    'count': 1,
  }, function(err, data) {
    var result = JSON.parse(data);
    var teams = result.results;
    var i = 0;

    function fetchTeamNum() {
      if (i < teams.length) {
        rel.query({
          'table': 'task',
          'where': { 'company': companyId, 'team': teams[i].objectId, 'status': { $in: [0, 1] } },
          "limit": 0,
          'count': 1,
        }, function(err, data) {
          var result = JSON.parse(data);
          arr.push({ 'title': teams[i].name, 'delayNum': 0, 'allNum': result.count || 0, teamId: teams[i].objectId });
          i++;
          fetchTeamNum();
        });
      } else {
        response.send(arr)
      }
    }

    fetchTeamNum();

  })


}

exports.comSum = onRequest;