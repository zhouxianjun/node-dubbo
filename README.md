

# 如何安装

[Node.js](http://nodejs.org).

[![NPM](https://nodei.co/npm/node-dubbo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-dubbo/)

npm install node-dubbo

# 注意

<font color=red> 该项目只支持 [jsonrpc协议](https://github.com/ofpay/dubbo-rpc-jsonrpc), 不支持 dubbo协议的服务提供者</font>

---

# 如何使用

## 服务提供者
```java
public interface XxxService {

    Object getXXX(String no);
}
```

## 消费者

```javascript
var DubboClient = require('node-dubbo');
//加载配置文件
var dubbo = new DubboClient(require('./dubbo.config.js'));
//获取serivce
var service = dubbo.getService('xxx.xxx.xxxService', '1.0');
service.call('getXXX', '38')
    .then(function(result){
        console.info(result);
        dubbo.destroy();
    })
    .catch(function(err){
        console.error(err.stack);
    });

```