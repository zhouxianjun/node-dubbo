'use strict';
const ring = require('ring');
const LoadBalance = require('./index');
const _ = require('underscore');
/**
 * 轮询算法
 */
module.exports = ring.create([LoadBalance], {
    serviceCount: {},
    getProvider: function (invokerDesc, providerList) {
        //1. 获取调用次数
        let desc = invokerDesc.toString(),
            callCount = this.serviceCount[desc] || -1;

        //2 调用次数加1
        callCount++;

        //3 拿下一个provider
        let index = callCount % providerList.length;

        //4. 设置调用次数
        this.serviceCount[desc] = callCount;

        return providerList[index];
    }
});