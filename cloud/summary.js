function onRequest(request, response, modules) {

  var db = modules.oData;
  var rel = modules.oRelation;
  var companyId = request.body.companyId;
  var userId = request.body.userId;
  var startTime = new Date();

  var obj = {
    'mySummary': [
      { 'title': '我负责的', 'delayNum': 0, 'allNum': 0 },
      { 'title': '我托付的', 'delayNum': 0, 'allNum': 0 },
      { 'title': '我关注的', 'delayNum': 0, 'allNum': 0 },
    ],
    'teamSummary': []
  };

  //step1.查跟我相关的任务数量
  fetchMyNum();

  function fetchMyNum() {
    rel.query({
      'table': 'task',
      'where': { 'company': companyId, 'assignee': userId, 'status': { $in: [0,1] } },
      "limit": 0,
      'count': 1,
    }, function(err, data) {
      var result = JSON.parse(data);
      obj.mySummary[0].allNum = result.count
      rel.query({
        'table': 'task',
        'where': { 'company': companyId, 'assigner': userId, 'assignee': {$ne: userId}, 'status': { $in: [0,1] } },
        "limit": 0,
        'count': 1,
      }, function(err, data) {
        var result = JSON.parse(data);
        obj.mySummary[1].allNum = result.count
        rel.query({
          'table': 'task',
          'where': { 'company': companyId, 'followers': userId, 'assignee': {$ne: userId}, 'status': { $in: [0,1] }  },
          "limit": 0,
          'count': 1,
        }, function(err, data) {
          var result = JSON.parse(data);
          obj.mySummary[2].allNum = result.count
          fetchCompanyTeams(); //接step2
        });
      });
    });
  }


  //step2.查公司下所有团队名称和任务数量
  function fetchCompanyTeams() {
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
            'where': { 'company': companyId, 'team': teams[i].objectId, 'status': { $in: [0,1] }  },
            "limit": 0,
            'count': 1,
          }, function(err, data) {
            var result = JSON.parse(data);
            obj.teamSummary.push({ 'title': teams[i].name, 'delayNum': 0, 'allNum': result.count || 0, 'teamId': teams[i].objectId, 'members': [] });
            i++;
            fetchTeamNum();
          });
        } else {
          fetchTeamMembers() //接step3
        }
      }
      fetchTeamNum();

    })
  }


  //step3.查团队下所有成员及其任务数量
  function fetchTeamMembers() {
    var k = 0;
    var i = 0;
    var members = [];

    function fetchMembers() {
      i = 0; //此处重置下i的值至关重要
      if (k < obj.teamSummary.length) {
        rel.query({
          'table': '_User',
          "where": { "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": obj.teamSummary[k].teamId }, "key": "members" } },
          'count': 1,
        }, function(err, data) {
          var result = JSON.parse(data);
          members = result.results;
          fetchMemberNum();
        })
      } else {
        endTime = new Date();
        obj['数据库查询耗时'] = new Date() - startTime;
        response.send(obj);
      };
    }

    function fetchMemberNum() {
      if (i < members.length) {
        rel.query({
          'table': 'task',
          'where': { 'company': companyId, 'assignee': members[i].objectId, 'status': { $in: [0,1] }  },
          "limit": 0,
          'count': 1,
        }, function(err, data) {
          var result = JSON.parse(data);
          obj.teamSummary[k].members.push({ 'avatar': members[i].avatar||{}, 'name': members[i].name, 'delayNum': 0, 'allNum': result.count || 0, userId: members[i].objectId });
          i++;
          fetchMemberNum();
        });
      } else {
        k++;
        fetchMembers();
      }
    }

    fetchMembers();

  }


}


exports.summary = onRequest;