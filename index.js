'use strict';
const ring = require('ring');
const Registry = require('./lib/registry');
const Invoker = require('./lib/rpc/invoker/index');
const InvokerDesc = require('./lib/rpc/invoker/desc');
const InvokerProxy = require('./lib/rpc/invoker/proxy');
const LoadBalance = require('./lib/rpc/cluster/loadBalance');
let Dubbo = ring.create({
    registry: null,
    init: function(option){
        this.registry = new Registry(option);
        process.on('SIGINT', function(){
            this.registry.destroy();
            process.exit(0);
        }.bind(this));
    },
    getService: function(serviceName, version, group){
        let invokerDesc = InvokerDesc.parse(serviceName, group, version),
            invoker = this.registry.getInvoker(invokerDesc);
        if (!invoker) {
            invokerDesc = new InvokerDesc(serviceName, group, version);
            invoker = new Invoker(invokerDesc, this.registry.cluster);
            this.registry.register(invokerDesc, new InvokerProxy(invoker, invokerDesc));
        }
        return invoker;
    },
    destroy: function(){
        this.registry.destroy();
    }
});
Dubbo.RandomBalance = require('./lib/rpc/cluster/loadBalance/random');
Dubbo.RoundBalance = require('./lib/rpc/cluster/loadBalance/round');
module.exports = Dubbo;