var tool = require("bmobcloud-local");
console.log('==== 开始测试 ==== \n')


//引入appkey配置
var options = require("../AppConfig.json");
tool.initialize(options.app_key, options.rest_key);


//测试在服务端代码
function server() {
    var path = require("path");
    tool.testInServer(path.resolve(__dirname, "../cloud/login.js"), { "username": "18768141530", "password": "123456" });
}

function local() {
    var login = require("../cloud/login.js").login;
    tool.test(login, { "username": "18768141530", "password": "123456" });
}


// local();
server();
