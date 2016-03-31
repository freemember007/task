function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   'subject': 'assigner',  //查询主体类型（assignee:负责人; assigner:托付人; followers:关注人; team:团队）
  //   'objectId': 'EuGz444d' //查询主体ID
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var ep = modules.oEvent;
  var subject = request.body.subject;
  var objectId = request.body.objectId;
  var condition = {};
  condition[subject] = objectId;
  if (subject === 'assigner') condition['assignee'] = { '$ne': objectId }; //托付的任务排除自己
  var tasks = [{}, {}, {}, {}];
  var tasksData = [
    [{ 'groupName': '无期限的', 'subGroupName': '', 'tasks': [] }],
    [],
    [],
    []
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
  var results = []

  rel.query({
    'table': 'task',
    'where': condition,
    'include': 'assignee',
    'limit': 60
  }, function(err, data) {
    var results = JSON.parse(data).results;

    // 生成tasks
    for (var i = 0; i < results.length; i++) {
      var status = results[i].status;
      results[i].fileNum = results[i].file ? 1 : 0;
      results[i].commentNum = results[i].comments ? results[i].comments.length : 0; //变态，明明是数组还要判断不为空
      if (!status) {
        tasksData[0][0].tasks.push(results[i]) //无期限的
      } else {
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


    //生成tasksData并排序
    for (var i = 1; i < tasks.length; i++) {
      for (var k in tasks[i]) {
        tasksData[i].push({ 'groupName': k, subGroupName: k, tasks: tasks[i][k] });
        sortByDate(tasksData[i]);
      }
    }

    //个性化GroupName
    for (var i = 1; i < tasksData.length; i++) {
      for (var j = 0; j < tasksData[i].length; j++) {
        then = new Date(tasksData[i][j].groupName);
        diff = (then - now) / oneDay;
        monthAndDate = (then.getMonth() + 1) + '月' + then.getDate() + '日';
        week = weekFormat(then.getDay());
        if (diff < 0 || diff > 7) {
          tasksData[i][j].groupName = monthAndDate;
          tasksData[i][j].subGroupName = week;
          if (diff < 0) tasksData[i][j].delay = true;
        } else if (diff === 0) {
          tasksData[i][j].groupName = '今天';
          tasksData[i][j].subGroupName = monthAndDate + ('(' + week + ')');
        } else if (diff === 1) {
          tasksData[i][j].groupName = '明天';
          tasksData[i][j].subGroupName = monthAndDate + ('(' + week + ')');
        } else { //diff >1 && diff < 7
          tasksData[i][j].groupName = week;
          tasksData[i][j].subGroupName = monthAndDate;
        }
      }
    }

    response.send(tasksData);
  })

  // 对日期分组进行排序
  function sortByDate(arr) {
    arr.sort(function(x, y) {
      if (x.groupName > y.groupName) {
        return 1;
      } else {
        return -1
      }
    })
  }

  // 星期处理
  function weekFormat(week) {
    if (week == 0) {
      str = "星期日";
    } else if (week == 1) {
      str = "星期一";
    } else if (week == 2) {
      str = "星期二";
    } else if (week == 3) {
      str = "星期三";
    } else if (week == 4) {
      str = "星期四";
    } else if (week == 5) {
      str = "星期五";
    } else if (week == 6) {
      str = "星期六";
    }
    return str;
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