var tool = require('bmobcloud-local');
console.log('==== 开始测试 ==== \n')


//引入appkey配置
var options = require('../AppConfig.json');
tool.initialize(options.app_key, options.rest_key);


//测试在服务端代码
function server() {
  var path = require('path');
  tool.testInServer(path.resolve(__dirname, '../cloud/createTask.js'), {
    'title': '测试通过接口发布任务', 
    'company': 'KbP15556',
    'team': 'W98PFFFR',
    'assigner': '8DRM999C', //郭敏
    'assignee': 'EuGz444d',
    'costHours': 4,
    'priority': 1,
    'project': {"color":"#FF666666","name":"点点医院-微信"},
    'file': {'__type': 'File','filename': 'Q20160301-0.png','group': 'group1','url': 'M03/D9/1F/oYYBAFbhCYiAeVzPAAKmJR5cJVM133.png'},
    'deadline': '2016-03-09 18:02:52'
  });
}


// local();
// setInterval(function(){server()},100)
server();