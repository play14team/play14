'use strict';

/**
 * hosting router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::hosting.hosting');
