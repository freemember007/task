var tool = require('bmobcloud-local');
console.log('==== 开始测试 ==== \n')


var options = require('../AppConfig.json');
tool.initialize(options.app_key, options.rest_key);


function server() {
  var path = require('path');
  tool.testInServer(path.resolve(__dirname, '../cloud/taskDetail.js'), {
    'taskId': '4e20f3d7c8'
  });
}


server();