function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'subject': 'assigner',  //查询主体类型（assignee:负责人; assigner:托付人; followers:关注人; team:团队）
  //   'objectId': 'EuGz444d', //查询主体ID
  //   'userId': 'EuGz444d', //当前用户ID
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var ep = modules.oEvent;
  var subject = request.body.subject;
  var objectId = request.body.objectId;
  var userId = request.body.userId;
  var condition = {};
  condition[subject] = objectId;
  if (subject === 'assigner') condition.assignee = { '$ne': objectId }; //托付的任务排除自己
  condition.status = { '$ne': 4 }; //排除删除的任务
  var tasks = [{}, {}, {}, {}];
  var tasksData = [
    [{ 'groupName': '无期限的', 'subGroupName': '', 'tasks': [] }],
    [],
    [{ 'groupName': '已完成的', 'subGroupName': '', 'tasks': [] }],
    [{ 'groupName': '已搁置的', 'subGroupName': '', 'tasks': [] }],
    [{ 'groupName': '指派的', 'subGroupName': '', 'tasks': [] }]
  ];
  var now = new Date();
  var nowString = now.toString();
  now.setHours(0);
  now.setMinutes(0);
  now.setSeconds(0);
  now.setMilliseconds(0);
  now = now.getTime();
  var then = new Date();
  var oneDay = 24 * 60 * 60 * 1000;
  var diff, monthAndDate, week;
  var weekFormat = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

  rel.query({
    'table': 'task',
    'where': condition,
    'include': 'assigner,assignee,team',
    'limit': 20,
    // 'updatedAt': { '$gt': { '__type': 'Date', 'iso': daysAgo } },
    'order': '-updatedAt'//按更新时间倒序排列
  }, function(err, data) {
    var results = JSON.parse(data).results;

    // 生成tasks
    for (var i = 0; i < results.length; i++) {
      var status = results[i].status;
      results[i].fileNum = results[i].file ? 1 : 0;
      results[i].commentNum = results[i].comments ? results[i].comments.length : 0; //变态，明明是数组还要判断不为空
      results[i].checklist = JSON.parse(results[i].checklist||'[]');
      results[i].followed = (results[i].followers || []).toString().indexOf(userId)!== -1 ? true : false;
      results[i].liked = (results[i].likers || []).toString().indexOf(userId)!== -1 ? true : false;
      if (status == 0) {
        tasksData[0][0].tasks.push(results[i]); //无期限的
      }else if(status == 2){
        tasksData[2][0].tasks.push(results[i]); //已完成的
      }else if(status == 3){
        tasksData[3][0].tasks.push(results[i]); //已搁置的
      }else {
        results[i].deadline = results[i].deadline || {
          '__type': 'Date',
          'iso': nowString
        }; // 兼容没有截止日期的已完成和搁置任务（暂时这么处理，后面考虑限制仅进行中的任务可以完成和搁置）
        if (isDelay(results[i].deadline)) results[i].delay = true;
        var date = results[i].deadline.iso.replace(/-/g, '/')
        if (!tasks[status][date]) tasks[status][date] = [];
        tasks[status][date].push(results[i]);
      }
    }

    // 非进行中的任务逆序排列
    // tasksData[0][0].tasks.reverse();
    // tasksData[2][0].tasks.reverse();
    // tasksData[3][0].tasks.reverse();


    // 进行中的任务按日期分组
    for (var k in tasks[1]) {
      tasksData[1].push({ 'groupName': k, subGroupName: k, tasks: tasks[1][k] });
      sortByDate(tasksData[1]);
    }

    // 进行中的任务个性化GroupName
    for (var j = 0; j < tasksData[1].length; j++) {
      then = new Date(tasksData[1][j].groupName);
      diff = (then - now) / oneDay;
      monthAndDate = (then.getMonth() + 1) + '月' + then.getDate() + '日';
      week = weekFormat[then.getDay()];
      if (diff < 0 || diff > 7) {
        tasksData[1][j].groupName = monthAndDate;
        tasksData[1][j].subGroupName = week;
        if (diff < 0) tasksData[1][j].delay = true;
      } else if (diff === 0) {
        tasksData[1][j].groupName = '今天';
        tasksData[1][j].subGroupName = monthAndDate + ('(' + week + ')');
      } else if (diff === 1) {
        tasksData[1][j].groupName = '明天';
        tasksData[1][j].subGroupName = monthAndDate + ('(' + week + ')');
      } else { //diff >1 && diff < 7
        tasksData[1][j].groupName = week;
        tasksData[1][j].subGroupName = monthAndDate;
      }
    }

    response.send(tasksData);

    // 取Ta指派的任务
    var queryObj = {assigner: request.body.objectId};
    var teamMembers = [];
    if(request.body.subject == 'team'){
      rel.query({
        'table': '_User',
        'keys': 'objectId',
        'where': {
          "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": request.body.objectId }, "key": "members" },
          'hidden': { '$ne': true }
        }
      }, function (err, data) {
        var members = JSON.parse(data).results;
        for(var i=0; i<members.length; i++){
          teamMembers.push(members[i].objectId);
        }
        queryObj = {
          assigner: {'$in': teamMembers},
          assignee: { '$ne': {'$in': teamMembers} }
        };
        rel.query({
          'table': 'task',
          'where': queryObj,
          'include': 'assigner,assignee,team',
          'limit': 10,
          'order': '-updatedAt'
        }, function(err, data) {
          var results = JSON.parse(data).results;
          for (var i = 0; i < results.length; i++) {
            results[i].fileNum = results[i].file ? 1 : 0;
            results[i].commentNum = results[i].comments ? results[i].comments.length : 0;
            results[i].checklist = JSON.parse(results[i].checklist||'[]');
            results[i].followed = (results[i].followers || []).toString().indexOf(userId)!== -1 ? true : false;
            results[i].liked = (results[i].likers || []).toString().indexOf(userId)!== -1 ? true : false;
            tasksData[4][0].tasks.push(results[i]); // Ta指派的
          }
          response.send(tasksData);
        });
      })
    }else{
      rel.query({
        'table': 'task',
        'where': queryObj,
        'include': 'assigner,assignee,team',
        'limit': 10,
        'order': '-updatedAt'
      }, function(err, data) {
        var results = JSON.parse(data).results;
        for (var i = 0; i < results.length; i++) {
          results[i].fileNum = results[i].file ? 1 : 0;
          results[i].commentNum = results[i].comments ? results[i].comments.length : 0;
          results[i].checklist = JSON.parse(results[i].checklist||'[]');
          results[i].followed = (results[i].followers || []).toString().indexOf(userId)!== -1 ? true : false;
          results[i].liked = (results[i].likers || []).toString().indexOf(userId)!== -1 ? true : false;
          tasksData[4][0].tasks.push(results[i]); // Ta指派的
        }
        response.send(tasksData);
      });
    }


  });

  // 日期分组排序方法
  function sortByDate(arr) {
    arr.sort(function(x, y) {
      if (x.groupName > y.groupName) {
        return 1;
      } else {
        return -1
      }
    })
  }

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

}
exports.taskList = onRequest;