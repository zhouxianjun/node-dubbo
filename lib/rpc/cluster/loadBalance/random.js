'use strict';
const ring = require('ring');
const LoadBalance = require('./index');
const _ = require('underscore');
/**
 * 随机算法
 */
module.exports = ring.create([LoadBalance], {
    getProvider: function (invokerDesc, providerList) {
        let length = providerList.length, //总个数
            totalWeight = 0,  //总权重
            sameWeight = true; //权重是否一样
        for (let i = 0; i < length; i++) {
            let weight = this.getProviderHostWeight(invokerDesc, providerList[i]);
            totalWeight += weight; //累计总权重
            if (sameWeight && i > 0 && weight != this.getProviderHostWeight(invokerDesc, providerList[i - 1])) { //计算所用权重是否一样
                sameWeight = false;
            }
        }

        if (totalWeight > 0 && !sameWeight) {
            // 如果权重不相同且权重大于0则按总权重随机
            let offset = Math.ceil(Math.random() * totalWeight);

            //并确定随机值落在哪个片段上
            for (let i = 0; i < length; i++) {
                offset -= this.getProviderHostWeight(invokerDesc, providerList[i]);
                if(offset <= 0){
                    return providerList[i];
                }
            }
        }
        let r = Math.ceil(Math.random() * length) - 1;
        return providerList[r];
    }
});