var tool = require('bmobcloud-local');
console.log('==== 开始测试 ==== \n')


//引入appkey配置
var options = require('../AppConfig.json');
tool.initialize(options.app_key, options.rest_key);


//测试在本地代码
function local() {
  var updatePush = require('../cloud/updatePush.js').updatePush;
  tool.test(updatePush);
}

//测试在服务端代码
function server() {
  var path = require('path');
  tool.testInServer(path.resolve(__dirname, '../cloud/updatePush.js'), {
    'objectId': '88e72241cc', //任务名：电话问诊原型 88e72241cc
    // 'status': 2,
    'comment': {
      'userName': '郭敏',
      'userUrl': 'http://file.bmob.cn/M03/AB/6F/oYYBAFbKrFOASa63AAAyn1JM9O4332.png',
      'sendTimg': '2016-03-14 14:27:58',
      'userId': 'EuGz444d',
      'userMsg': '哈哈'
    }
  });
}


// local();
server();