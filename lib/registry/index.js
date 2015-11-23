'use strict';
const Q = require('q'),
    Zookeeper = require('node-zookeeper-client'),
    ring = require('ring'),
    Config = require('../config'),
    _ = require('underscore');
const Cluster = require('../rpc/cluster');
const LoadBalance = require('../rpc/cluster/loadBalance');
module.exports = ring.create({
    zookeeper: null,
    serviceMap: new Map(),
    initQueue: [],
    config: null,
    cluster: null,
    init: function(option){
        this.config = new Config(option);
        this.cluster = new Cluster(option.loadBalance && ring.instance(option.loadBalance, LoadBalance) ? option.loadBalance : null, this.config);
        this.connect();
    },
    connect: function(){
        let self = this;
        this.isInitializing = true;
        this.zookeeper = Zookeeper.createClient(this.config.getRegistryAddress(), this.config.getRegistryOption());
        this.zookeeper.once('connected', function () {
            self.initQueue.forEach(function (p) { //从队列中获取, 租个通知
                p.resolve(self.zookeeper);
            });
            self.isInitializing = false;
            console.log('Registry : 已连接上zookeeper');
        });
        this.zookeeper.connect();
    },
    register: function(invokerDesc, invoker){
        let descStr = invokerDesc.toString();
        //let serviceName = invokerDesc.getService();

        //判断是否已经订阅过
        if (!this.serviceMap.has(descStr)) {
            this.serviceMap.set(descStr, invoker);
            this.subscribe(invokerDesc)
                .done(function (client) {
                    /*var registryPath = Config.getRegistryPath(serviceName);
                     client.create(registryPath, null, Zookeeper.CreateMode.EPHEMERAL, function (err) {
                     if (err)
                     console.error('Registry : 注册失败 [' + descStr + '] [' + err.toString() + ']');
                     else
                     console.log('Registry : 注册成功 [' + descStr + ']');
                     });*/
                });
        }
    },
    getInvoker: function(invokerDesc){
        return this.serviceMap.has(invokerDesc) && this.serviceMap.get(invokerDesc).invoke;
    },
    getZookeeper: function(){
        let defer = Q.defer();
        if (this.zookeeper) {
            defer.resolve(this.zookeeper);
        }
        //如果正在初始化中, 其他就不要初始化了, 加入队列等待
        else if (this.isInitializing) {
            this.initQueue.push(defer.promise);
        }
        return defer.promise;
    },
    subscribe: function(invokerDesc){
        let self = this,
            desc = invokerDesc.toString(),
            service = invokerDesc.getService(),
            path = this.config.getSubscribePath(service),
            eventTime = 3000,
            start = 0,
            listChildren = function(client){
                client.getChildren(
                    path,
                    function (event) {
                        //有时候这里会调用多次,所以这里做了控制只调用一次
                        var now = new Date().getTime();
                        if(now - start > eventTime){
                            start = now;
                            listChildren(client);
                        }
                    },
                    function (err, children, stat) {
                        if (err) {
                            self.exception(err, 'Registry : 订阅失败 [' + desc + ']');
                        }
                        else if (children.length > 0) {
                            self.onMethodChangeHandler(invokerDesc, children);
                        }
                        else {
                            console.warn('Registry : 尚未发现服务提供者 [' + desc + ']');
                        }
                    }
                );
            };
        return this.getZookeeper()
            .then(function (client) {
                listChildren(client);
                return client;
            })
            .then(function (client) {
                self.configurators(invokerDesc);
                return client;
            });
    },
    onMethodChangeHandler: function (invokerDesc, children) {
        let count = 0, has = false;
        children.forEach(function (child) {
            child = decodeURIComponent(child);
            let mHost = /^jsonrpc:\/\/([^\/]+)\//.exec(child),
                mVersion = /version=(.+)/.exec(child),
                mGroup = /group=([^&]+)/.exec(child),
                mMehtod = /methods=([^&]+)/.exec(child);

            //有方法, 并且匹配成功
            if (mHost && mMehtod) {
                if(invokerDesc.isMatch(mGroup && mGroup[1], mVersion && mVersion[1])) {
                    count += this.serviceMap.get(invokerDesc.toString()).setProviderMethod(mMehtod[1].split(','));
                    console.info('Registry : 提供者 [' + invokerDesc + '] HOST [' + mHost[1] + ']');
                    this.cluster.addProvider(invokerDesc, mHost[1]);
                    has = true;
                }else{
                    console.info('Registry : 移除提供者 [' + invokerDesc + '] HOST [' + mHost[1] + ']');
                    this.cluster.removeProvider(invokerDesc, mHost[1]);
                }
            }
        }.bind(this));
        this.cluster.refreshProvider(invokerDesc);
        if(has){
            console.log('Registry : 订阅成功 [' + invokerDesc + '] [' + count + ']');
        }else{
            console.warn('Registry : 尚未发现服务提供者 [' + invokerDesc + ']');
        }
        return count;
    },
    configurators: function (invokerDesc) {
        let serviceName = invokerDesc.getService(),
            path = this.config.getConfiguratorsPath(serviceName),
            start = 0,
            self = this,
            listChildren = function (client) {
                client.getChildren(path,
                    function () {
                        //有时候这里会调用多次,所以这里做了控制只调用一次
                        var now = new Date().getTime();
                        if(now - start > eventTime){
                            start = now;
                            listChildren(client);
                        }
                    },
                    function (err, children) {
                        if (err) {
                            self.exception(err, 'Registry : 获取权重失败 [' + serviceName + ']');
                        }
                        else if (children.length > 0) {
                            children.forEach(function (child) {
                                child = decodeURIComponent(child);
                                var mHost = /^override:\/\/([^\/]+)\//.exec(child),
                                    mVersion = /version=(\w+)/.exec(child),
                                    mGroup = /group=([^&]+)/.exec(child),
                                    mDisabled = /disabled=([^&]+)/.exec(child),
                                    mEnable = /enabled=([^&]+)/.exec(child),
                                    mWeight = /weight=(\d+)/.exec(child);

                                //console.error(mHost[1] + ' ---- ' + (mWeight ? mWeight[1] : 1) + '-----' + (mVersion ? mVersion[1] : ''));
                                if (((mEnable && mEnable[1] == 'true') || (mDisabled && mDisabled[1] == 'false')) && invokerDesc.isMatch(mGroup && mGroup[1], mVersion && mVersion[1])) { //可用
                                    Cluster.setProviderWeight(invokerDesc, mHost[1], mWeight ? mWeight[1] : Config.getDefaultWeight()); //没权重的默认1拉
                                }
                            });
                            console.log('Registry : 获取权重成功 [' + serviceName + '] ');
                        } else {
                            console.warn('Registry : 获取权重失败 [' + serviceName + '] [ 未配置权重 ]');
                        }
                    }
                );
            };
        this.getZookeeper()
            .done(function (client) {
                listChildren(client);
            });
    },
    exception: function(err, info){
        if(!err)return;
        if(info){
            console.error(info + ' [' + err.toString() +']')
        }else{
            console.error(error.stack);
        }
        switch (err.getCode()){
            case Zookeeper.Exception.CONNECTION_LOSS:
            case Zookeeper.Exception.SESSION_EXPIRED:
                this.connect();
                break;
        }
    },
    destroy: function(){
        //TODO: 现在有问题, 后期处理
        if(this.zookeeper){
            this.zookeeper.close();
        }
    }
});