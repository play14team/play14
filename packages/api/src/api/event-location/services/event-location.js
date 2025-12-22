'use strict';

/**
 * event-location service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::event-location.event-location');
