'use strict';

/**
 * expectation service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::expectation.expectation');
