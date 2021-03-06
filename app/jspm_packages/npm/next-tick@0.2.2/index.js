/* */ 
(function(process) {
  'use strict';
  var callable,
      byObserver;
  callable = function(fn) {
    if (typeof fn !== 'function')
      throw new TypeError(fn + " is not a function");
    return fn;
  };
  byObserver = function(Observer) {
    var node = document.createTextNode(''),
        queue,
        i = 0;
    new Observer(function() {
      var data;
      if (!queue)
        return;
      data = queue;
      queue = null;
      if (typeof data === 'function') {
        data();
        return;
      }
      data.forEach(function(fn) {
        fn();
      });
    }).observe(node, {characterData: true});
    return function(fn) {
      callable(fn);
      if (queue) {
        if (typeof queue === 'function')
          queue = [queue, fn];
        else
          queue.push(fn);
        return;
      }
      queue = fn;
      node.data = (i = ++i % 2);
    };
  };
  module.exports = (function() {
    if ((typeof process !== 'undefined') && process && (typeof process.nextTick === 'function')) {
      return process.nextTick;
    }
    if ((typeof document === 'object') && document) {
      if (typeof MutationObserver === 'function') {
        return byObserver(MutationObserver);
      }
      if (typeof WebKitMutationObserver === 'function') {
        return byObserver(WebKitMutationObserver);
      }
    }
    if (typeof setImmediate === 'function') {
      return function(cb) {
        setImmediate(callable(cb));
      };
    }
    if (typeof setTimeout === 'function') {
      return function(cb) {
        setTimeout(callable(cb), 0);
      };
    }
    return null;
  }());
})(require("process"));
