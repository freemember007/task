function onRequest(request, response, modules) {

  // 请求PostBody示例
  // {
  //   "username": "18989878980", //用户手机号
  //   "password": "123456" //用户密码
  // }

  var db = modules.oData;
  var rel = modules.oRelation;
  var ep = modules.oEvent;
  var username = request.body.username;
  var password = request.body.password;
  var userInfo = {}; //当前用户信息，含所属公司，团队
  var companyInfo = {}; //当前公司信息，含所有团队及每个团队的成员
  var startTime = new Date();

  // 登录并获取当前用户个人信息
  db.userLogin({
    'username': username, //登录用户名
    'password': password //用户密码
  }, function(err, data) { //回调函数
    data = JSON.parse(data);
    if(data.code){
      response.send(data);
    }else{
      userInfo = data;
      ep.emit('userLogin');
    }
    
  });

  // 获取当前用户所属团队
  ep.once('userLogin', function() {
    rel.query({
      'table': 'team',
      'keys': 'name, objectId',
      'where': { 'members': userInfo.objectId }
    }, function(err, data) {
      var team = JSON.parse(data).results && JSON.parse(data).results[0];
      userInfo.team = team;
    })
  });

  // 获取当前用户积分
  // ep.once('userLogin', function() {
  //   db.find({
  //     'table': 'task',
  //     'sum': 'costHours',
  //     'where': { 'assignee': userInfo.objectId, 'status': 2 }
  //   }, function(err, data) {
  //     var results = JSON.parse(data).results;
  //     userInfo.score = results.length && results[0]._sumCostHours || 0
  //   })
  // });

  // 获取当前用户所属公司
  ep.once('userLogin', function() {
    rel.query({
      'table': 'company',
      'keys': 'name,projects,boss,objectId',
      'where': { 'members': userInfo.objectId }
    }, function(err, data) {
      companyInfo = JSON.parse(data).results && JSON.parse(data).results[0];
      userInfo.company = {
        name: companyInfo.name,
        objectId: companyInfo.objectId
      };
      ep.emit('queryMyCompany');
    })
  });


  // 获取当前公司下属所有团队及成员信息
  ep.once('queryMyCompany', function() {
    // response.send(companyInfo.objectId)
    db.find({
      'table': 'team',
      'keys': 'name,objectId,leader',
      "where": { 'company': companyInfo.objectId }
    }, function(err, data) {
      var teams = JSON.parse(data).results;

      ep.after('queryTeamMembers', teams.length, function(members) {
        for (var i = 0; i < teams.length; i++) {
          teams[i].members = JSON.parse(members[i]).results;
          delete teams[i].createdAt;
          delete teams[i].updatedAt;
        }
        companyInfo.teams = teams;
        response.send({
          'userInfo': userInfo,
          'companyInfo': companyInfo,
          '数据查询耗时': new Date() - startTime,
        })
      })

      for (var i = 0; i < teams.length; i++) {
        rel.query({
          'table': '_User',
          'keys': 'username,name,avatar,objectId',
          'where': { "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": teams[i].objectId }, "key": "members" } }
        }, ep.group('queryTeamMembers'))
      }

    })
  });

}


exports.login = onRequest;