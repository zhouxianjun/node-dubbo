var DubboClient = require('../index');
var dubbo = new DubboClient(require('./dubbo.config.js'));
var playerRoleService = dubbo.getService('game.world.service.PlayerRoleService', '1.0');
playerRoleService.call('getPlayerRole', 38)
    .then(function(result){
        console.info(result);
        dubbo.destroy();
    })
    .catch(function(err){
        console.error(err.stack);
    });
