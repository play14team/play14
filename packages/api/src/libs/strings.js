"use strict";

const slugify = require('slugify');

function eventToSlug(name, start) {
  const date = new Date(start);
  const month = (date.getMonth() + 1).toString();
  return toSlug(name) + "-" + month.padStart(2, "0");
}

function toSlug(value) {
  const normalized = normalize(value);
	return slugify(normalized, {remove: /[*+~.,&()'"!:@#?]/g}).toLowerCase();
}

function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function capitalize(value) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

module.exports = { toSlug, eventToSlug, capitalize, normalize };
