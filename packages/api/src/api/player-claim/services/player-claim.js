'use strict';

/**
 * player-claim service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::player-claim.player-claim');
