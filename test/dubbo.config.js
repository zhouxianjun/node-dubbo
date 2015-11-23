module.exports = {

    /**
     *
     */
    application: {
        'application': 'dubbo_node_client',
        'application.version': '1.0',
        'category': 'consumer',
        'dubbo': 'dubbo_node_client_1.0',
        'side': 'consumer',
        'pid': process.pid,
        'version': '1.0'
    },


    /**
     * 注册中心
     */
    registry: '192.168.5.188:2181',

    /**
     * 负载均衡规则, 目前只有轮询
     */
    loadBalance: null
};