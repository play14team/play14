'use strict';

/**
 * hosting controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::hosting.hosting');
