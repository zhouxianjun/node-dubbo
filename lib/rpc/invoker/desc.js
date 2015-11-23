'use strict';
const ring = require('ring');
let InvokerDesc = ring.create({
    serviceName: null,
    group: null,
    version: null,
    init: function (serviceName, group, version) {
        this.serviceName = serviceName;
        this.group = group ? group + '' : null;
        this.version = version ? version + '' : null;
    },
    isMatch: function (group, version) {
        return this.group == group && this.version == version;
    },
    getService: function () {
        return this.serviceName;
    },
    isMatchDesc: function (desc) {
        return this.group == desc.group && this.version == desc.version;
    },
    toString: function () {
        return InvokerDesc.parse(this.serviceName, this.group, this.version);
    }
});
InvokerDesc.parse = function(serviceName, group, version){
    return serviceName + '_' + (group || ' ') + '_' + (version || ' ');
};
module.exports = InvokerDesc;