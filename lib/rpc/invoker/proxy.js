'use strict';
const ring = require('ring');
const _ = require('underscore');
module.exports = ring.create({
    invoke: null,
    invokerDescStr: null,
    init: function(invoker, invokerDesc){
        this.invoke = invoker;
        this.invokerDescStr = invokerDesc.toString();
    },
    /**
     * 当zookeeper通知, 刷新一下, 获取改provider的所有方法
     * @param methods
     * @returns {number}
     */
    setProviderMethod: function(methods){
        let count = 0;
        for (let i = 0; i < methods.length; i++) {
            var method = methods[i];
            if(!this.invoke[method]) {
                console.log('InvokerProxy : 提供者 [' + this.invokerDescStr + '] 方法 [' + method + ']');
                this.invoke[method] = this.proxyCall(method)
                count++;
            }
        }
        return count;
    },
    /**
     * 代理, 主要还是调用Invoker的call方法
     * @param methodName
     * @returns {Function}
     */
    proxyCall: function (methodName) {
        return function () {
            let args = [methodName].concat(_.toArray(arguments));
            return this.call.apply(this, args);
        };
    }
});