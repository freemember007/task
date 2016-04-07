var tool = require('bmobcloud-local');
console.log('==== 开始测试 ==== \n')


//引入appkey配置
var options = require('../AppConfig.json');
tool.initialize(options.app_key, options.rest_key);


//测试在服务端代码
function server() {
  var path = require('path');
  tool.testInServer(path.resolve(__dirname, '../cloud/createPush.js'), {
    'objectId': '14d8a15bdc',
    'title': '测试通过接口发布任务', 
    'company': 'KbP15556',
    'team': 'W98PFFFR',
    'assigner': '7GT0F77R', //EuGz444d
    'assignee': 'EuGz444d',
    'costHours': 4,
    'deadline': '2016-03-09 18:02:52',
    'status': 1,
  });
}


// local();
server();