/* */ 
'use strict';
var isArray = require("x-is-array");
var h = require("./index");
var SVGAttributeNamespace = require("./svg-attribute-namespace");
var attributeHook = require("./hooks/attribute-hook");
var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
module.exports = svg;
function svg(tagName, properties, children) {
  if (!children && isChildren(properties)) {
    children = properties;
    properties = {};
  }
  properties = properties || {};
  properties.namespace = SVG_NAMESPACE;
  var attributes = properties.attributes || (properties.attributes = {});
  for (var key in properties) {
    if (!properties.hasOwnProperty(key)) {
      continue;
    }
    var namespace = SVGAttributeNamespace(key);
    if (namespace === undefined) {
      continue;
    }
    var value = properties[key];
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      continue;
    }
    if (namespace !== null) {
      properties[key] = attributeHook(namespace, value);
      continue;
    }
    attributes[key] = value;
    properties[key] = undefined;
  }
  return h(tagName, properties, children);
}
function isChildren(x) {
  return typeof x === 'string' || isArray(x);
}
