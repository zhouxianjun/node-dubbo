'use strict';
const IP = require('ip'),
    _ = require('underscore'),
    ring = require('ring'),
    QS = require('querystring');
module.exports = ring.create({
    option: {
        dubbo: {
            providerTimeout: 3,
            weight: 1
        },
        group: 'dubbo',
        registryTimeout: 30 * 1000, //超时
        registryDelay: 1000, //延迟
        registryRetry: 0 //重试次数
    },
    ip: IP.address(),
    init: function(opt){
        this.option = _.extend(this.option, opt);
    },
    /**
     * 获取默认权重
     */
    getDefaultWeight: function(){
        return this.option.dubbo.weight;
    },

    /**
     * 获取注册中心的地址和配置
     */
    getRegistryAddress: function () {
        return this.option.registry;
    },
    getRegistryPath: function (serviceName) {
        this.option.application.interface = serviceName;
        var params = QS.stringify(this.option.application);
        var url = '/' + this.option.group + '/' + serviceName + '/consumers/' + encodeURIComponent('consumer://' + this.ip + '/' + serviceName + '?') + params;
        return url;
    },
    getSubscribePath: function (serviceName) {
        return '/' + this.option.group + '/' + serviceName + '/providers';
    },
    getConfiguratorsPath: function(serviceName){
        return '/' + this.option.group + '/' + serviceName + '/configurators';
    },
    getRegistryOption: function () {
        return {
            sessionTimeout: this.option.registryTimeout,
            spinDelay: this.option.registryDelay,
            retries: this.option.registryRetry
        };
    },


    /**
     * 获取Provider超时时间
     */
    getProviderTimeout: function(){
        return this.option.dubbo.providerTimeout * 1000;
    }
});