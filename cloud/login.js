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

  // 登录
  db.userLogin({
    'username': username, //登录用户名
    'password': password //用户密码
  }, function(err, data) { //回调函数
    data = JSON.parse(data);
    if(data.code){
      response.send(data);
    }else{
      userInfo = data;
      // response.send(userInfo.objectId);
      //获取团队信息与公司信息
      rel.query({
        'table': 'team',
        'include': 'company',
        'where': { 'members': userInfo.objectId }
      }, function(err, data) {
        var team = JSON.parse(data).results && JSON.parse(data).results[0];
        userInfo.team = team;
        // response.send(team.objectId);
        userInfo.company = {
          name: team.company.name,
          objectId: team.company.objectId
        };
        // companyInfo = {
        //   name: team.company.name,
        //   objectId: team.company.objectId,
        //   projects: team.company.projects
        // };
        companyInfo = team.company;

        //获取公司下所有团队信息
        db.find({
          'table': 'team',
          'keys': 'name,objectId,leader',
          "where": { 'company': companyInfo.objectId }
        }, function(err, data) {
          var teams = JSON.parse(data).results;
          // response.send(teams);
          ep.after('queryTeamMembers', teams.length, function(members) {
            for (var i = 0; i < teams.length; i++) {

              teams[i].members = JSON.parse(members[i]).results;
              delete teams[i].createdAt;
              delete teams[i].updatedAt;
              // 自己的团队排前
              if(teams[i].objectId === userInfo.team.objectId){
                var arr = teams.splice(i, 1);
                teams.unshift(arr[0])
              }
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
              'where': { 
                "$relatedTo": { "object": { "__type": "Pointer", "className": "team", "objectId": teams[i].objectId }, "key": "members" },
                'hidden': { '$ne': true }
              }
            }, ep.group('queryTeamMembers'))
          }

        })
      })
    }
    
  });  

}


exports.login = onRequest;