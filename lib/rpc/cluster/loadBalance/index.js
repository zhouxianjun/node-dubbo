'use strict';
const Config = require('../../../config/index');
const ring = require('ring');
module.exports = ring.create({
    providerWeightMap: {},
    setProviderWeight: function (invokerDesc, providerHost, weight) {
        this.providerWeightMap[invokerDesc.toString() + '_' + providerHost] = weight;
    },
    getProviderHostWeight: function (invokerDesc, providerHost) {
        return this.providerWeightMap[invokerDesc.toString() + '_' + providerHost] || Config.getDefaultWeight();
    },
    getProvider: function (invokerDesc, providerList) {
        if (providerList.length <= 1) {
            return providerList[0];
        }else {
            console.warn('LoadBalance : 不要用默认类, 这个只会返回第一个提供者');
            return providerList[0];
        }
    }
});