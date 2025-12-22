'use strict';

/**
 * expectation router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::expectation.expectation');
