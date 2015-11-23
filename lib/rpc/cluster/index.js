'use strict';
const ring = require('ring');
const Q = require('q');
const RandomBalance = require('./loadBalance/random');
const _ = require('underscore');
module.exports = ring.create({
    providerMap: {},
    promiseMap: {},
    providerTimeoutMap: new Map(),
    loadBalance: null,
    config: null,
    init: function(loadbalance, config){
        this.loadBalance = loadbalance || new RandomBalance();
        this.config = config;
    },
    /**
     * 删除provider
     * @param invokeDesc
     * @param providerHost
     * @returns {Array<provider>}
     */
    removeProvider: function(invokeDesc, providerHost){
        let desc = invokeDesc.toString(),
            h = this.promiseMap[desc];
        if (h) {
            let i = _.indexOf(h, providerHost);
            h.slice(i, 1);
        }
        return h;
    },
    /**
     * 新增provider
     * @param invokeDesc
     * @param providerHost
     * @returns {Array<provider>}
     */
    addProvider: function (invokeDesc, providerHost) {
        let desc = invokeDesc.toString(),
            h = this.providerMap[desc] || [];
        h.push(providerHost);
        this.providerMap[desc] = h;
        return h;
    },
    refreshProvider: function(invokeDesc){
        let desc = invokeDesc.toString(),
            h = this.providerMap[desc];

        let list = this.promiseMap[desc];
        if (h && list) {
            //移除超时提示
            this.providerTimeoutMap.delete(desc);

            //逐个通知
            this.promiseMap[desc] = [];
            for (var i = 0; i < list.length; i++) {
                list[i].resolve(h);
            }
        }
    },
    /**
     * 获取所有provider
     * @param invokerDesc
     * @returns {Q.promise}
     */
    getAllProvider: function(invokerDesc){
        let desc = invokerDesc.toString(),
            q = Q.defer();
        if (this.providerMap[desc]) {
            q.resolve(this.providerMap[desc]);
        } else {
            this.promiseMap[desc] = this.promiseMap[desc] || [];
            this.promiseMap[desc].push(q);

            let index = this.promiseMap.length - 1;
            this.providerTimeoutMap.set(desc, setTimeout(function () {
                q.reject('获取服务提供者超时 [' + desc + ']');
                this.promiseMap[desc].slice(index, 1);
            }.bind(this), this.config.getProviderTimeout()));
        }
        return q.promise;
    },
    /**
     * 获取provider
     * @param invokerDesc
     * @returns {provider}
     */
    getProvider: function (invokerDesc) {
        return this.getAllProvider(invokerDesc).then(function (ps) {
            if (ps.length <= 1) {
                return ps[0] || '';
            } else {
                return this.loadbalance.getProvider(invokerDesc, ps);
            }
        }.bind(this));
    },
    setProviderWeight: function(invokerDesc, providerHost, weight){
        this.loadbalance.setProviderWeight(invokerDesc, providerHost, weight);
    }
});