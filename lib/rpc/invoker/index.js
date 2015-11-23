'use strict';
const ring = require('ring');
const Q = require('q');
const _ = require('underscore');
const Request = require('request');
const time = new Date().getTime();
const toUrl = function (provider, serviceName) {
    return 'http://' + provider + '/' + serviceName
};
const toPostData = function (methodName, methodArgs) {
    return {
        "jsonrpc": "2.0",
        "method": methodName,
        "params": methodArgs,
        "id": time - 1
    };
};
const send = function (url, data) {
    var q = Q.defer();
    Request({
        url: url,
        method: 'post',
        form: JSON.stringify(data),
        headers: {
            "Content-type": "application/json-rpc",
            "Accept": "text/json"
        }
    }, function (err, response, body) {
        if (err) {
            q.reject({code: 0, message: 'err.toString()'});
        }
        else {
            body = JSON.parse(body);
            if (body.error) {
                q.reject(body.error);
            }
            else {
                q.resolve(body.result);
            }
        }
    });
    return q.promise;
};
module.exports = ring.create({
    invokerDesc: null,
    cluster: null,
    init: function(invokerDesc, cluster){
        this.invokerDesc = invokerDesc;
        this.cluster = cluster;
        if(!this.cluster || !ring.instance(this.cluster, require('../cluster'))){
            throw new TypeError('不正确的cluster.');
        }
    },
    call: function(methodName){
        let desc = this.invokerDesc,
            service = desc.serviceName,
            methodArgs = toPostData(methodName, _.toArray(arguments).slice(1));

        return this.cluster.getProvider(desc)
            .then(function (provider) {
                var url = toUrl(provider, service);
                return send(url, methodArgs)
            });
    }
});