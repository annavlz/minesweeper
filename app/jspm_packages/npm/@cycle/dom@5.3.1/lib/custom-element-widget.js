/* */ 
"use strict";
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
var _require = require('@cycle/core');
var Rx = _require.Rx;
var ALL_PROPS = "*";
var PROPS_DRIVER_NAME = "props";
var EVENTS_SINK_NAME = "events";
function makeDispatchFunction(element, eventName) {
  return function dispatchCustomEvent(evData) {
    var event = undefined;
    try {
      event = new Event(eventName);
    } catch (err) {
      event = document.createEvent("Event");
      event.initEvent(eventName, true, true);
    }
    event.detail = evData;
    element.dispatchEvent(event);
  };
}
function subscribeDispatchers(element) {
  var customEvents = element.cycleCustomElementMetadata.customEvents;
  var disposables = new Rx.CompositeDisposable();
  for (var _name in customEvents) {
    if (customEvents.hasOwnProperty(_name) && typeof customEvents[_name].subscribe === "function") {
      var disposable = customEvents[_name].subscribe(makeDispatchFunction(element, _name));
      disposables.add(disposable);
    }
  }
  return disposables;
}
function subscribeDispatchersWhenRootChanges(metadata) {
  return metadata.rootElem$.distinctUntilChanged(Rx.helpers.identity, function(x, y) {
    return x && y && x.isEqualNode && x.isEqualNode(y);
  }).subscribe(function resubscribeDispatchers(rootElem) {
    if (metadata.eventDispatchingSubscription) {
      metadata.eventDispatchingSubscription.dispose();
    }
    metadata.eventDispatchingSubscription = subscribeDispatchers(rootElem);
  });
}
function subscribeEventDispatchingSink(element, widget) {
  element.cycleCustomElementMetadata.eventDispatchingSubscription = subscribeDispatchers(element);
  widget.disposables.add(element.cycleCustomElementMetadata.eventDispatchingSubscription);
  widget.disposables.add(subscribeDispatchersWhenRootChanges(element.cycleCustomElementMetadata));
}
function makePropertiesDriver() {
  var propertiesDriver = {};
  var defaultComparer = Rx.helpers.defaultComparer;
  Object.defineProperty(propertiesDriver, "type", {
    enumerable: false,
    value: "PropertiesDriver"
  });
  Object.defineProperty(propertiesDriver, "get", {
    enumerable: false,
    value: function get(streamKey) {
      var comparer = arguments.length <= 1 || arguments[1] === undefined ? defaultComparer : arguments[1];
      if (typeof streamKey === "undefined") {
        throw new Error("Custom element driver `props.get()` expects an " + "argument in the getter.");
      }
      if (typeof this[streamKey] === "undefined") {
        this[streamKey] = new Rx.ReplaySubject(1);
      }
      return this[streamKey].distinctUntilChanged(Rx.helpers.identity, comparer);
    }
  });
  Object.defineProperty(propertiesDriver, "getAll", {
    enumerable: false,
    value: function getAll() {
      return this.get(ALL_PROPS);
    }
  });
  return propertiesDriver;
}
function createContainerElement(tagName, vtreeProperties) {
  var element = document.createElement("div");
  element.id = vtreeProperties.id || "";
  element.className = vtreeProperties.className || "";
  element.className += " cycleCustomElement-" + tagName.toUpperCase();
  element.className = element.className.trim();
  element.cycleCustomElementMetadata = {
    propertiesDriver: null,
    rootElem$: null,
    customEvents: null,
    eventDispatchingSubscription: false
  };
  return element;
}
function throwIfVTreeHasPropertyChildren(vtree) {
  if (typeof vtree.properties.children !== "undefined") {
    throw new Error("Custom element should not have property `children`. " + "It is reserved for children elements nested into this custom element.");
  }
}
function makeCustomElementInput(domOutput, propertiesDriver, domDriverName) {
  var _ref;
  return (_ref = {}, _defineProperty(_ref, domDriverName, domOutput), _defineProperty(_ref, PROPS_DRIVER_NAME, propertiesDriver), _ref);
}
function makeConstructor() {
  return function customElementConstructor(vtree, CERegistry, driverName) {
    throwIfVTreeHasPropertyChildren(vtree);
    this.type = "Widget";
    this.properties = vtree.properties;
    this.properties.children = vtree.children;
    this.key = vtree.key;
    this.isCustomElementWidget = true;
    this.customElementsRegistry = CERegistry;
    this.driverName = driverName;
    this.firstRootElem$ = new Rx.ReplaySubject(1);
    this.disposables = new Rx.CompositeDisposable();
  };
}
function validateDefFnOutput(defFnOutput, domDriverName, tagName) {
  if (typeof defFnOutput !== "object") {
    throw new Error("Custom element definition function for `" + tagName + "` " + " should output an object.");
  }
  if (typeof defFnOutput[domDriverName] === "undefined") {
    throw new Error("Custom element definition function for '" + tagName + "' " + ("should output an object containing `" + domDriverName + "`."));
  }
  if (typeof defFnOutput[domDriverName].subscribe !== "function") {
    throw new Error("Custom element definition function for `" + tagName + "` " + "should output an object containing an Observable of VTree, named " + ("`" + domDriverName + "`."));
  }
  for (var _name2 in defFnOutput) {
    if (defFnOutput.hasOwnProperty(_name2) && _name2 !== domDriverName && _name2 !== EVENTS_SINK_NAME) {
      throw new Error("Unknown `" + _name2 + "` found on custom element " + ("`" + tagName + "`s definition function's output."));
    }
  }
}
function makeInit(tagName, definitionFn) {
  var _require2 = require('./render-dom');
  var makeDOMDriverWithRegistry = _require2.makeDOMDriverWithRegistry;
  return function initCustomElement() {
    var widget = this;
    var driverName = widget.driverName;
    var registry = widget.customElementsRegistry;
    var element = createContainerElement(tagName, widget.properties);
    var proxyVTree$ = new Rx.ReplaySubject(1);
    var domDriver = makeDOMDriverWithRegistry(element, registry);
    var propertiesDriver = makePropertiesDriver();
    var domResponse = domDriver(proxyVTree$, driverName);
    var rootElem$ = domResponse.select(":root").observable;
    rootElem$.subscribe(function(rootElem) {
      element = rootElem;
    });
    var defFnInput = makeCustomElementInput(domResponse, propertiesDriver, driverName);
    var requests = definitionFn(defFnInput);
    validateDefFnOutput(requests, driverName, tagName);
    widget.disposables.add(requests[driverName].subscribe(proxyVTree$.asObserver()));
    widget.disposables.add(rootElem$.subscribe(widget.firstRootElem$.asObserver()));
    element.cycleCustomElementMetadata = {
      propertiesDriver: propertiesDriver,
      rootElem$: rootElem$,
      customEvents: requests.events,
      eventDispatchingSubscription: false
    };
    subscribeEventDispatchingSink(element, widget);
    widget.disposables.add(widget.firstRootElem$);
    widget.disposables.add(proxyVTree$);
    widget.disposables.add(domResponse);
    widget.update(null, element);
    return element;
  };
}
function validatePropertiesDriverInMetadata(element, fnName) {
  if (!element) {
    throw new Error("Missing DOM element when calling `" + fnName + "` on " + "custom element Widget.");
  }
  if (!element.cycleCustomElementMetadata) {
    throw new Error("Missing custom element metadata on DOM element when " + ("calling `" + fnName + "` on custom element Widget."));
  }
  var metadata = element.cycleCustomElementMetadata;
  if (metadata.propertiesDriver.type !== "PropertiesDriver") {
    throw new Error("Custom element metadata's propertiesDriver type is " + ("invalid: `" + metadata.propertiesDriver.type + "`."));
  }
}
function updateCustomElement(previous, element) {
  if (previous) {
    this.disposables = previous.disposables;
    this.firstRootElem$.onNext(0);
    this.firstRootElem$.onCompleted();
  }
  validatePropertiesDriverInMetadata(element, "update()");
  var propsDriver = element.cycleCustomElementMetadata.propertiesDriver;
  if (propsDriver.hasOwnProperty(ALL_PROPS)) {
    propsDriver[ALL_PROPS].onNext(this.properties);
  }
  for (var prop in propsDriver) {
    if (propsDriver.hasOwnProperty(prop) && this.properties.hasOwnProperty(prop)) {
      propsDriver[prop].onNext(this.properties[prop]);
    }
  }
}
function destroyCustomElement(element) {
  var propsDriver = element.cycleCustomElementMetadata.propertiesDriver;
  for (var prop in propsDriver) {
    if (propsDriver.hasOwnProperty(prop)) {
      this.disposables.add(propsDriver[prop]);
    }
  }
  if (element.cycleCustomElementMetadata.eventDispatchingSubscription) {
    this.disposables.add(element.cycleCustomElementMetadata.eventDispatchingSubscription);
  }
  this.disposables.dispose();
}
function makeWidgetClass(tagName, definitionFn) {
  if (typeof definitionFn !== "function") {
    throw new Error("A custom element definition given to the DOM driver " + "should be a function.");
  }
  var WidgetClass = makeConstructor();
  WidgetClass.definitionFn = definitionFn;
  WidgetClass.prototype.init = makeInit(tagName, definitionFn);
  WidgetClass.prototype.update = updateCustomElement;
  WidgetClass.prototype.destroy = destroyCustomElement;
  return WidgetClass;
}
module.exports = {
  makeDispatchFunction: makeDispatchFunction,
  subscribeDispatchers: subscribeDispatchers,
  subscribeDispatchersWhenRootChanges: subscribeDispatchersWhenRootChanges,
  makePropertiesDriver: makePropertiesDriver,
  createContainerElement: createContainerElement,
  throwIfVTreeHasPropertyChildren: throwIfVTreeHasPropertyChildren,
  makeConstructor: makeConstructor,
  makeInit: makeInit,
  updateCustomElement: updateCustomElement,
  destroyCustomElement: destroyCustomElement,
  ALL_PROPS: ALL_PROPS,
  makeCustomElementInput: makeCustomElementInput,
  makeWidgetClass: makeWidgetClass
};
