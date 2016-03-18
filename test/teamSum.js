var tool = require("bmobcloud-local");
console.log('==== 开始测试 ==== \n')


//引入appkey配置
var options = require("../AppConfig.json");
tool.initialize(options.app_key, options.rest_key);


//测试在本地代码
function local() {
  var hello = require("../cloud/summary.js").hello;
  tool.test(hello);
}

//测试在服务端代码
function server() {
  var path = require("path");
  tool.testInServer(path.resolve(__dirname, "../cloud/teamSum.js"), {"companyId": "KbP15556", "teamId": "W98PFFFR"});
}
function server3() {
  var path = require("path");
  tool.testInServer(path.resolve(__dirname, "../cloud/summary.js"), {"companyId": "KbP15556", "userId": "EuGz444d"});
}

// local();
server();