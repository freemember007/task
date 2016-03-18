function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var companyId = request.body.companyId;
  var teamId = request.body.teamId;
  var fileBaseUrl = 'http://file.bmob.cn/';
  var arr = [];

  //查团队下所有成员及其任务数量
  rel.query({
    'table': '_User',
    "where": { "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": teamId }, "key": "members" } },
    'count': 1,
  }, function(err, data) {
    var result = JSON.parse(data);
    var members = result.results;
    var i = 0;

    function fetchMemberNum() {
      if (i < members.length) {
        rel.query({
          'table': 'task',
          'where': { 'company': companyId, 'assignee': members[i].objectId, 'status': { $in: [0,1] } },
          "limit":0,
          'count': 1,
        }, function(err, data) {
          var result = JSON.parse(data);
          var avatarUrl = '';
          if(members[i].avatar && members[i].avatar.url) {avatarUrl = fileBaseUrl + members[i].avatar.url}
          // response.send(result)
          arr.push({'avatarUrl': avatarUrl, 'name': members[i].name, 'delayNum': 0, 'allNum': result.count || 0, userId: members[i].objectId });
          i++;
          fetchMemberNum();
        });
      } else {
        response.send(arr)
      }
    }

    fetchMemberNum();
  });

}

exports.teamSum = onRequest;