/* */ 
"use strict";
var _require = require('@cycle/core');
var Rx = _require.Rx;
var toHTML = require('vdom-to-html');
var _require2 = require('./custom-elements');
var replaceCustomElementsWithSomething = _require2.replaceCustomElementsWithSomething;
var makeCustomElementsRegistry = _require2.makeCustomElementsRegistry;
var _require3 = require('./custom-element-widget');
var makeCustomElementInput = _require3.makeCustomElementInput;
var ALL_PROPS = _require3.ALL_PROPS;
var _require4 = require('./transposition');
var transposeVTree = _require4.transposeVTree;
function makePropertiesDriverFromVTree(vtree) {
  return {get: function get(propertyName) {
      if (propertyName === ALL_PROPS) {
        return Rx.Observable.just(vtree.properties);
      } else {
        return Rx.Observable.just(vtree.properties[propertyName]);
      }
    }};
}
function makeReplaceCustomElementsWithVTree$(CERegistry, driverName) {
  return function replaceCustomElementsWithVTree$(vtree) {
    return replaceCustomElementsWithSomething(vtree, CERegistry, function toVTree$(_vtree, WidgetClass) {
      var interactions = {get: function get() {
          return Rx.Observable.empty();
        }};
      var props = makePropertiesDriverFromVTree(_vtree);
      var input = makeCustomElementInput(interactions, props);
      var output = WidgetClass.definitionFn(input);
      var vtree$ = output[driverName].last();
      return convertCustomElementsToVTree(vtree$, CERegistry, driverName);
    });
  };
}
function convertCustomElementsToVTree(vtree$, CERegistry, driverName) {
  return vtree$.map(makeReplaceCustomElementsWithVTree$(CERegistry, driverName)).flatMap(transposeVTree);
}
function makeResponseGetter() {
  return function get(selector) {
    if (console && console.log) {
      console.log("WARNING: HTML Driver's get(selector) is deprecated.");
    }
    if (selector === ":root") {
      return this;
    } else {
      return Rx.Observable.empty();
    }
  };
}
function makeBogusSelect() {
  return function select() {
    return {
      observable: Rx.Observable.empty(),
      events: function events() {
        return Rx.Observable.empty();
      }
    };
  };
}
function makeHTMLDriver() {
  var customElementDefinitions = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];
  var registry = makeCustomElementsRegistry(customElementDefinitions);
  return function htmlDriver(vtree$, driverName) {
    var vtreeLast$ = vtree$.last();
    var output$ = convertCustomElementsToVTree(vtreeLast$, registry, driverName).map(function(vtree) {
      return toHTML(vtree);
    });
    output$.get = makeResponseGetter();
    output$.select = makeBogusSelect();
    return output$;
  };
}
module.exports = {
  makePropertiesDriverFromVTree: makePropertiesDriverFromVTree,
  makeReplaceCustomElementsWithVTree$: makeReplaceCustomElementsWithVTree$,
  convertCustomElementsToVTree: convertCustomElementsToVTree,
  makeHTMLDriver: makeHTMLDriver
};
