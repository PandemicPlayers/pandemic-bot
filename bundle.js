(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _phoenix_js = require('phoenix_js');

var socket = new _phoenix_js.Socket('ws://10.111.3.87:4000/socket');
socket.connect();
socket.onClose(function (e) {
  return console.log('Closed connection');
});

var channel = socket.channel('game', {});
channel.join().receive('ok', function (response) {
  return console.log('Ok', response);
}).receive('error', function () {
  return console.log('Connection error');
});

channel.on('pong', function (message) {
  return console.log('On Pong', message);
});

channel.push('ping').receive('ok', function (message) {
  return console.log('Ping Reply', message);
});

channel.push({ type: 'connect', nickname: 'Chris' });

channel.push('game:state').receive('ok', function (state) {
  console.log('State', state);
});

},{"phoenix_js":2}],2:[function(require,module,exports){
(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define("phoenix_js", ["exports"], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.phoenix_js = mod.exports;
  }
})(this, function (exports) {
  "use strict";

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  var VSN = "1.0.0";

  var SOCKET_STATES = { connecting: 0, open: 1, closing: 2, closed: 3 };

  var DEFAULT_TIMEOUT = 10000;

  var CHANNEL_STATES = {
    closed: "closed",
    errored: "errored",
    joined: "joined",
    joining: "joining"
  };

  var CHANNEL_EVENTS = {
    close: "phx_close",
    error: "phx_error",
    join: "phx_join",
    reply: "phx_reply",
    leave: "phx_leave"
  };

  var TRANSPORTS = {
    longpoll: "longpoll",
    websocket: "websocket"
  };

  var Ajax = (function () {
    function Ajax() {
      _classCallCheck(this, Ajax);
    }

    _createClass(Ajax, null, [{
      key: "request",
      value: function request(method, endPoint, accept, body, timeout, ontimeout, callback) {
        if (window.XDomainRequest) {
          var req = new XDomainRequest(); // IE8, IE9
          this.xdomainRequest(req, method, endPoint, body, timeout, ontimeout, callback);
        } else {
          var req = window.XMLHttpRequest ? new XMLHttpRequest() : // IE7+, Firefox, Chrome, Opera, Safari
          new ActiveXObject("Microsoft.XMLHTTP"); // IE6, IE5
          this.xhrRequest(req, method, endPoint, accept, body, timeout, ontimeout, callback);
        }
      }
    }, {
      key: "xdomainRequest",
      value: function xdomainRequest(req, method, endPoint, body, timeout, ontimeout, callback) {
        var _this = this;

        // IE8 throws an obscure "Stack overflow at line: 0" error because it goes into a loop
        // over cached requests. So we break the cache to prevent that.
        endPoint = this.appendParams(endPoint, { _cache: new Date().getTime() });

        req.open(method, endPoint);
        req.timeout = timeout;
        req.onload = function () {
          var response = _this.parseJSON(req.responseText);
          callback && callback(response);
        };
        if (ontimeout) {
          req.ontimeout = ontimeout;
        }

        // Work around bug in IE9 that requires an attached onprogress handler
        req.onprogress = function () {};

        req.send(body);
      }
    }, {
      key: "xhrRequest",
      value: function xhrRequest(req, method, endPoint, accept, body, timeout, ontimeout, callback) {
        var _this2 = this;

        req.open(method, endPoint, true);
        req.timeout = timeout;
        req.setRequestHeader("Content-Type", accept);
        req.onerror = function () {
          callback && callback(null);
        };
        req.onreadystatechange = function () {
          if (req.readyState === _this2.states.complete && callback) {
            var response = _this2.parseJSON(req.responseText);
            callback(response);
          }
        };
        if (ontimeout) {
          req.ontimeout = ontimeout;
        }

        req.send(body);
      }
    }, {
      key: "parseJSON",
      value: function parseJSON(resp) {
        return resp && resp !== "" ? JSON.parse(resp) : null;
      }
    }, {
      key: "serialize",
      value: function serialize(obj, parentKey) {
        var queryStr = [];
        for (var key in obj) {
          if (!obj.hasOwnProperty(key)) {
            continue;
          }
          var paramKey = parentKey ? parentKey + "[" + key + "]" : key;
          var paramVal = obj[key];
          if (typeof paramVal === "object") {
            queryStr.push(this.serialize(paramVal, paramKey));
          } else {
            queryStr.push(encodeURIComponent(paramKey) + "=" + encodeURIComponent(paramVal));
          }
        }
        return queryStr.join("&");
      }
    }, {
      key: "appendParams",
      value: function appendParams(url, params) {
        if (Object.keys(params).length === 0) {
          return url;
        }

        var prefix = url.match(/\?/) ? "&" : "?";
        return "" + url + prefix + this.serialize(params);
      }
    }]);

    return Ajax;
  })();

  Ajax.states = { complete: 4 };

  var LongPoll$1 = (function () {
    function LongPoll$1(endPoint) {
      _classCallCheck(this, LongPoll$1);

      this.endPoint = null;
      this.token = null;
      this.skipHeartbeat = true;
      this.onopen = function () {}; // noop
      this.onerror = function () {}; // noop
      this.onmessage = function () {}; // noop
      this.onclose = function () {}; // noop
      this.pollEndpoint = this.normalizeEndpoint(endPoint);
      this.readyState = SOCKET_STATES.connecting;

      this.poll();
    }

    // export websocket just like LongPoll so it's easier to reason about

    _createClass(LongPoll$1, [{
      key: "normalizeEndpoint",
      value: function normalizeEndpoint(endPoint) {
        return endPoint.replace("ws://", "http://").replace("wss://", "https://").replace(new RegExp("(.*)\/" + TRANSPORTS.websocket), "$1/" + TRANSPORTS.longpoll);
      }
    }, {
      key: "endpointURL",
      value: function endpointURL() {
        return Ajax.appendParams(this.pollEndpoint, { token: this.token });
      }
    }, {
      key: "closeAndRetry",
      value: function closeAndRetry() {
        this.close();
        this.readyState = SOCKET_STATES.connecting;
      }
    }, {
      key: "ontimeout",
      value: function ontimeout() {
        this.onerror("timeout");
        this.closeAndRetry();
      }
    }, {
      key: "poll",
      value: function poll() {
        var _this3 = this;

        if (!(this.readyState === SOCKET_STATES.open || this.readyState === SOCKET_STATES.connecting)) {
          return;
        }

        Ajax.request("GET", this.endpointURL(), "application/json", null, this.timeout, this.ontimeout.bind(this), function (resp) {
          if (resp) {
            var status = resp.status;
            var token = resp.token;
            var messages = resp.messages;

            _this3.token = token;
          } else {
            var status = 0;
          }

          switch (status) {
            case 200:
              messages.forEach(function (msg) {
                return _this3.onmessage({ data: JSON.stringify(msg) });
              });
              _this3.poll();
              break;
            case 204:
              _this3.poll();
              break;
            case 410:
              _this3.readyState = SOCKET_STATES.open;
              _this3.onopen();
              _this3.poll();
              break;
            case 0:
            case 500:
              _this3.onerror();
              _this3.closeAndRetry();
              break;
            default:
              throw "unhandled poll status " + status;
          }
        });
      }
    }, {
      key: "send",
      value: function send(body) {
        var _this4 = this;

        Ajax.request("POST", this.endpointURL(), "application/json", body, this.timeout, this.onerror.bind(this, "timeout"), function (resp) {
          if (!resp || resp.status !== 200) {
            _this4.onerror(status);
            _this4.closeAndRetry();
          }
        });
      }
    }, {
      key: "close",
      value: function close(code, reason) {
        this.readyState = SOCKET_STATES.closed;
        this.onclose();
      }
    }]);

    return LongPoll$1;
  })();

  var WebSocket$1 = window.WebSocket;

  var Push = (function () {

    // Initializes the Push
    //
    // channel - The Channel
    // event - The event, for example `"phx_join"`
    // payload - The payload, for example `{user_id: 123}`
    // timeout - The push timeout in milliseconds
    //

    function Push(channel, event, payload, timeout) {
      _classCallCheck(this, Push);

      this.channel = channel;
      this.event = event;
      this.payload = payload || {};
      this.receivedResp = null;
      this.timeout = timeout;
      this.timeoutTimer = null;
      this.recHooks = [];
      this.sent = false;
    }

    // Creates a timer that accepts a `timerCalc` function to perform
    // calculated timeout retries, such as exponential backoff.
    //
    // ## Examples
    //
    //    let reconnectTimer = new Timer(() => this.connect(), function(tries){
    //      return [1000, 5000, 10000][tries - 1] || 10000
    //    })
    //    reconnectTimer.setTimeout() // fires after 1000
    //    reconnectTimer.setTimeout() // fires after 5000
    //    reconnectTimer.reset()
    //    reconnectTimer.setTimeout() // fires after 1000
    //

    _createClass(Push, [{
      key: "resend",
      value: function resend(timeout) {
        this.timeout = timeout;
        this.cancelRefEvent();
        this.ref = null;
        this.refEvent = null;
        this.receivedResp = null;
        this.sent = false;
        this.send();
      }
    }, {
      key: "send",
      value: function send() {
        if (this.hasReceived("timeout")) {
          return;
        }
        this.startTimeout();
        this.sent = true;
        this.channel.socket.push({
          topic: this.channel.topic,
          event: this.event,
          payload: this.payload,
          ref: this.ref
        });
      }
    }, {
      key: "receive",
      value: function receive(status, callback) {
        if (this.hasReceived(status)) {
          callback(this.receivedResp.response);
        }

        this.recHooks.push({ status: status, callback: callback });
        return this;
      }

      // private

    }, {
      key: "matchReceive",
      value: function matchReceive(_ref) {
        var status = _ref.status;
        var response = _ref.response;
        var ref = _ref.ref;

        this.recHooks.filter(function (h) {
          return h.status === status;
        }).forEach(function (h) {
          return h.callback(response);
        });
      }
    }, {
      key: "cancelRefEvent",
      value: function cancelRefEvent() {
        if (!this.refEvent) {
          return;
        }
        this.channel.off(this.refEvent);
      }
    }, {
      key: "cancelTimeout",
      value: function cancelTimeout() {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
    }, {
      key: "startTimeout",
      value: function startTimeout() {
        var _this5 = this;

        if (this.timeoutTimer) {
          return;
        }
        this.ref = this.channel.socket.makeRef();
        this.refEvent = this.channel.replyEventName(this.ref);

        this.channel.on(this.refEvent, function (payload) {
          _this5.cancelRefEvent();
          _this5.cancelTimeout();
          _this5.receivedResp = payload;
          _this5.matchReceive(payload);
        });

        this.timeoutTimer = setTimeout(function () {
          _this5.trigger("timeout", {});
        }, this.timeout);
      }
    }, {
      key: "hasReceived",
      value: function hasReceived(status) {
        return this.receivedResp && this.receivedResp.status === status;
      }
    }, {
      key: "trigger",
      value: function trigger(status, response) {
        this.channel.trigger(this.refEvent, { status: status, response: response });
      }
    }]);

    return Push;
  })();

  var Timer = (function () {
    function Timer(callback, timerCalc) {
      _classCallCheck(this, Timer);

      this.callback = callback;
      this.timerCalc = timerCalc;
      this.timer = null;
      this.tries = 0;
    }

    _createClass(Timer, [{
      key: "reset",
      value: function reset() {
        this.tries = 0;
        clearTimeout(this.timer);
      }

      // Cancels any previous setTimeout and schedules callback
    }, {
      key: "setTimeout",
      value: (function (_setTimeout) {
        function setTimeout() {
          return _setTimeout.apply(this, arguments);
        }

        setTimeout.toString = function () {
          return _setTimeout.toString();
        };

        return setTimeout;
      })(function () {
        var _this6 = this;

        clearTimeout(this.timer);

        this.timer = setTimeout(function () {
          _this6.tries = _this6.tries + 1;
          _this6.callback();
        }, this.timerCalc(this.tries + 1));
      })
    }]);

    return Timer;
  })();

  var Channel = (function () {
    function Channel(topic, params, socket) {
      var _this7 = this;

      _classCallCheck(this, Channel);

      this.state = CHANNEL_STATES.closed;
      this.topic = topic;
      this.params = params || {};
      this.socket = socket;
      this.bindings = [];
      this.timeout = this.socket.timeout;
      this.joinedOnce = false;
      this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
      this.pushBuffer = [];
      this.rejoinTimer = new Timer(function () {
        return _this7.rejoinUntilConnected();
      }, this.socket.reconnectAfterMs);
      this.joinPush.receive("ok", function () {
        _this7.state = CHANNEL_STATES.joined;
        _this7.rejoinTimer.reset();
        _this7.pushBuffer.forEach(function (pushEvent) {
          return pushEvent.send();
        });
        _this7.pushBuffer = [];
      });
      this.onClose(function () {
        _this7.socket.log("channel", "close " + _this7.topic);
        _this7.state = CHANNEL_STATES.closed;
        _this7.socket.remove(_this7);
      });
      this.onError(function (reason) {
        _this7.socket.log("channel", "error " + _this7.topic, reason);
        _this7.state = CHANNEL_STATES.errored;
        _this7.rejoinTimer.setTimeout();
      });
      this.joinPush.receive("timeout", function () {
        if (_this7.state !== CHANNEL_STATES.joining) {
          return;
        }

        _this7.socket.log("channel", "timeout " + _this7.topic, _this7.joinPush.timeout);
        _this7.state = CHANNEL_STATES.errored;
        _this7.rejoinTimer.setTimeout();
      });
      this.on(CHANNEL_EVENTS.reply, function (payload, ref) {
        _this7.trigger(_this7.replyEventName(ref), payload);
      });
    }

    // Phoenix Channels JavaScript client
    //
    // ## Socket Connection
    //
    // A single connection is established to the server and
    // channels are mulitplexed over the connection.
    // Connect to the server using the `Socket` class:
    //
    //     let socket = new Socket("/ws", {params: {userToken: "123"}})
    //     socket.connect()
    //
    // The `Socket` constructor takes the mount point of the socket,
    // the authentication params, as well as options that can be found in
    // the Socket docs, such as configuring the `LongPoll` transport, and
    // heartbeat.
    //
    // ## Channels
    //
    // Channels are isolated, concurrent processes on the server that
    // subscribe to topics and broker events between the client and server.
    // To join a channel, you must provide the topic, and channel params for
    // authorization. Here's an example chat room example where `"new_msg"`
    // events are listened for, messages are pushed to the server, and
    // the channel is joined with ok/error/timeout matches:
    //
    //     let channel = socket.channel("rooms:123", {token: roomToken})
    //     channel.on("new_msg", msg => console.log("Got message", msg) )
    //     $input.onEnter( e => {
    //       channel.push("new_msg", {body: e.target.val}, 10000)
    //        .receive("ok", (msg) => console.log("created message", msg) )
    //        .receive("error", (reasons) => console.log("create failed", reasons) )
    //        .receive("timeout", () => console.log("Networking issue...") )
    //     })
    //     channel.join()
    //       .receive("ok", ({messages}) => console.log("catching up", messages) )
    //       .receive("error", ({reason}) => console.log("failed join", reason) )
    //       .receive("timeout", () => console.log("Networking issue. Still waiting...") )
    //
    //
    // ## Joining
    //
    // Joining a channel with `channel.join(topic, params)`, binds the params to
    // `channel.params`. Subsequent rejoins will send up the modified params for
    // updating authorization params, or passing up last_message_id information.
    // Successful joins receive an "ok" status, while unsuccessful joins
    // receive "error".
    //
    //
    // ## Pushing Messages
    //
    // From the previous example, we can see that pushing messages to the server
    // can be done with `channel.push(eventName, payload)` and we can optionally
    // receive responses from the push. Additionally, we can use
    // `receive("timeout", callback)` to abort waiting for our other `receive` hooks
    //  and take action after some period of waiting.
    //
    //
    // ## Socket Hooks
    //
    // Lifecycle events of the multiplexed connection can be hooked into via
    // `socket.onError()` and `socket.onClose()` events, ie:
    //
    //     socket.onError( () => console.log("there was an error with the connection!") )
    //     socket.onClose( () => console.log("the connection dropped") )
    //
    //
    // ## Channel Hooks
    //
    // For each joined channel, you can bind to `onError` and `onClose` events
    // to monitor the channel lifecycle, ie:
    //
    //     channel.onError( () => console.log("there was an error!") )
    //     channel.onClose( () => console.log("the channel has gone away gracefully") )
    //
    // ### onError hooks
    //
    // `onError` hooks are invoked if the socket connection drops, or the channel
    // crashes on the server. In either case, a channel rejoin is attemtped
    // automatically in an exponential backoff manner.
    //
    // ### onClose hooks
    //
    // `onClose` hooks are invoked only in two cases. 1) the channel explicitly
    // closed on the server, or 2). The client explicitly closed, by calling
    // `channel.leave()`
    //

    _createClass(Channel, [{
      key: "rejoinUntilConnected",
      value: function rejoinUntilConnected() {
        this.rejoinTimer.setTimeout();
        if (this.socket.isConnected()) {
          this.rejoin();
        }
      }
    }, {
      key: "join",
      value: function join() {
        var timeout = arguments.length <= 0 || arguments[0] === undefined ? this.timeout : arguments[0];

        if (this.joinedOnce) {
          throw "tried to join multiple times. 'join' can only be called a single time per channel instance";
        } else {
          this.joinedOnce = true;
        }
        this.rejoin(timeout);
        return this.joinPush;
      }
    }, {
      key: "onClose",
      value: function onClose(callback) {
        this.on(CHANNEL_EVENTS.close, callback);
      }
    }, {
      key: "onError",
      value: function onError(callback) {
        this.on(CHANNEL_EVENTS.error, function (reason) {
          return callback(reason);
        });
      }
    }, {
      key: "on",
      value: function on(event, callback) {
        this.bindings.push({ event: event, callback: callback });
      }
    }, {
      key: "off",
      value: function off(event) {
        this.bindings = this.bindings.filter(function (bind) {
          return bind.event !== event;
        });
      }
    }, {
      key: "canPush",
      value: function canPush() {
        return this.socket.isConnected() && this.state === CHANNEL_STATES.joined;
      }
    }, {
      key: "push",
      value: function push(event, payload) {
        var timeout = arguments.length <= 2 || arguments[2] === undefined ? this.timeout : arguments[2];

        if (!this.joinedOnce) {
          throw "tried to push '" + event + "' to '" + this.topic + "' before joining. Use channel.join() before pushing events";
        }
        var pushEvent = new Push(this, event, payload, timeout);
        if (this.canPush()) {
          pushEvent.send();
        } else {
          pushEvent.startTimeout();
          this.pushBuffer.push(pushEvent);
        }

        return pushEvent;
      }

      // Leaves the channel
      //
      // Unsubscribes from server events, and
      // instructs channel to terminate on server
      //
      // Triggers onClose() hooks
      //
      // To receive leave acknowledgements, use the a `receive`
      // hook to bind to the server ack, ie:
      //
      //     channel.leave().receive("ok", () => alert("left!") )
      //
    }, {
      key: "leave",
      value: function leave() {
        var _this8 = this;

        var timeout = arguments.length <= 0 || arguments[0] === undefined ? this.timeout : arguments[0];

        var onClose = function onClose() {
          _this8.socket.log("channel", "leave " + _this8.topic);
          _this8.trigger(CHANNEL_EVENTS.close, "leave");
        };
        var leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
        leavePush.receive("ok", function () {
          return onClose();
        }).receive("timeout", function () {
          return onClose();
        });
        leavePush.send();
        if (!this.canPush()) {
          leavePush.trigger("ok", {});
        }

        return leavePush;
      }

      // Overridable message hook
      //
      // Receives all events for specialized message handling
    }, {
      key: "onMessage",
      value: function onMessage(event, payload, ref) {}

      // private

    }, {
      key: "isMember",
      value: function isMember(topic) {
        return this.topic === topic;
      }
    }, {
      key: "sendJoin",
      value: function sendJoin(timeout) {
        this.state = CHANNEL_STATES.joining;
        this.joinPush.resend(timeout);
      }
    }, {
      key: "rejoin",
      value: function rejoin() {
        var timeout = arguments.length <= 0 || arguments[0] === undefined ? this.timeout : arguments[0];

        this.sendJoin(timeout);
      }
    }, {
      key: "trigger",
      value: function trigger(triggerEvent, payload, ref) {
        this.onMessage(triggerEvent, payload, ref);
        this.bindings.filter(function (bind) {
          return bind.event === triggerEvent;
        }).map(function (bind) {
          return bind.callback(payload, ref);
        });
      }
    }, {
      key: "replyEventName",
      value: function replyEventName(ref) {
        return "chan_reply_" + ref;
      }
    }]);

    return Channel;
  })();

  var Socket = (function () {

    // Initializes the Socket
    //
    // endPoint - The string WebSocket endpoint, ie, "ws://example.com/ws",
    //                                               "wss://example.com"
    //                                               "/ws" (inherited host & protocol)
    // opts - Optional configuration
    //   transport - The Websocket Transport, for example WebSocket or Phoenix.LongPoll.
    //               Defaults to WebSocket with automatic LongPoll fallback.
    //   timeout - The default timeout in milliseconds to trigger push timeouts.
    //             Defaults `DEFAULT_TIMEOUT`
    //   heartbeatIntervalMs - The millisec interval to send a heartbeat message
    //   reconnectAfterMs - The optional function that returns the millsec
    //                      reconnect interval. Defaults to stepped backoff of:
    //
    //     function(tries){
    //       return [1000, 5000, 10000][tries - 1] || 10000
    //     }
    //
    //   logger - The optional function for specialized logging, ie:
    //     `logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
    //
    //   longpollerTimeout - The maximum timeout of a long poll AJAX request.
    //                        Defaults to 20s (double the server long poll timer).
    //
    //   params - The optional params to pass when connecting
    //
    // For IE8 support use an ES5-shim (https://github.com/es-shims/es5-shim)
    //

    function Socket(endPoint) {
      var _this9 = this;

      var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

      _classCallCheck(this, Socket);

      this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] };
      this.channels = [];
      this.sendBuffer = [];
      this.ref = 0;
      this.timeout = opts.timeout || DEFAULT_TIMEOUT;
      this.transport = opts.transport || WebSocket$1 || LongPoll$1;
      this.heartbeatIntervalMs = opts.heartbeatIntervalMs || 30000;
      this.reconnectAfterMs = opts.reconnectAfterMs || function (tries) {
        return [1000, 2000, 5000, 10000][tries - 1] || 10000;
      };
      this.logger = opts.logger || function () {}; // noop
      this.longpollerTimeout = opts.longpollerTimeout || 20000;
      this.params = opts.params || {};
      this.endPoint = endPoint + "/" + TRANSPORTS.websocket;
      this.reconnectTimer = new Timer(function () {
        _this9.disconnect(function () {
          return _this9.connect();
        });
      }, this.reconnectAfterMs);
    }

    _createClass(Socket, [{
      key: "protocol",
      value: function protocol() {
        return location.protocol.match(/^https/) ? "wss" : "ws";
      }
    }, {
      key: "endPointURL",
      value: function endPointURL() {
        var uri = Ajax.appendParams(Ajax.appendParams(this.endPoint, this.params), { vsn: VSN });
        if (uri.charAt(0) !== "/") {
          return uri;
        }
        if (uri.charAt(1) === "/") {
          return this.protocol() + ":" + uri;
        }

        return this.protocol() + "://" + location.host + uri;
      }
    }, {
      key: "disconnect",
      value: function disconnect(callback, code, reason) {
        if (this.conn) {
          this.conn.onclose = function () {}; // noop
          if (code) {
            this.conn.close(code, reason || "");
          } else {
            this.conn.close();
          }
          this.conn = null;
        }
        callback && callback();
      }

      // params - The params to send when connecting, for example `{user_id: userToken}`
    }, {
      key: "connect",
      value: function connect(params) {
        var _this10 = this;

        if (params) {
          console && console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor");
          this.params = params;
        }
        if (this.conn) {
          return;
        }

        this.conn = new this.transport(this.endPointURL());
        this.conn.timeout = this.longpollerTimeout;
        this.conn.onopen = function () {
          return _this10.onConnOpen();
        };
        this.conn.onerror = function (error) {
          return _this10.onConnError(error);
        };
        this.conn.onmessage = function (event) {
          return _this10.onConnMessage(event);
        };
        this.conn.onclose = function (event) {
          return _this10.onConnClose(event);
        };
      }

      // Logs the message. Override `this.logger` for specialized logging. noops by default
    }, {
      key: "log",
      value: function log(kind, msg, data) {
        this.logger(kind, msg, data);
      }

      // Registers callbacks for connection state change events
      //
      // Examples
      //
      //    socket.onError(function(error){ alert("An error occurred") })
      //
    }, {
      key: "onOpen",
      value: function onOpen(callback) {
        this.stateChangeCallbacks.open.push(callback);
      }
    }, {
      key: "onClose",
      value: function onClose(callback) {
        this.stateChangeCallbacks.close.push(callback);
      }
    }, {
      key: "onError",
      value: function onError(callback) {
        this.stateChangeCallbacks.error.push(callback);
      }
    }, {
      key: "onMessage",
      value: function onMessage(callback) {
        this.stateChangeCallbacks.message.push(callback);
      }
    }, {
      key: "onConnOpen",
      value: function onConnOpen() {
        var _this11 = this;

        this.log("transport", "connected to " + this.endPointURL(), this.transport.prototype);
        this.flushSendBuffer();
        this.reconnectTimer.reset();
        if (!this.conn.skipHeartbeat) {
          clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = setInterval(function () {
            return _this11.sendHeartbeat();
          }, this.heartbeatIntervalMs);
        }
        this.stateChangeCallbacks.open.forEach(function (callback) {
          return callback();
        });
      }
    }, {
      key: "onConnClose",
      value: function onConnClose(event) {
        this.log("transport", "close", event);
        this.triggerChanError();
        clearInterval(this.heartbeatTimer);
        this.reconnectTimer.setTimeout();
        this.stateChangeCallbacks.close.forEach(function (callback) {
          return callback(event);
        });
      }
    }, {
      key: "onConnError",
      value: function onConnError(error) {
        this.log("transport", error);
        this.triggerChanError();
        this.stateChangeCallbacks.error.forEach(function (callback) {
          return callback(error);
        });
      }
    }, {
      key: "triggerChanError",
      value: function triggerChanError() {
        this.channels.forEach(function (channel) {
          return channel.trigger(CHANNEL_EVENTS.error);
        });
      }
    }, {
      key: "connectionState",
      value: function connectionState() {
        switch (this.conn && this.conn.readyState) {
          case SOCKET_STATES.connecting:
            return "connecting";
          case SOCKET_STATES.open:
            return "open";
          case SOCKET_STATES.closing:
            return "closing";
          default:
            return "closed";
        }
      }
    }, {
      key: "isConnected",
      value: function isConnected() {
        return this.connectionState() === "open";
      }
    }, {
      key: "remove",
      value: function remove(channel) {
        this.channels = this.channels.filter(function (c) {
          return !c.isMember(channel.topic);
        });
      }
    }, {
      key: "channel",
      value: function channel(topic) {
        var chanParams = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var channelInstance = new Channel(topic, chanParams, this);
        this.channels.push(channelInstance);
        return channelInstance;
      }
    }, {
      key: "push",
      value: function push(data) {
        var _this12 = this;

        var topic = data.topic;
        var event = data.event;
        var payload = data.payload;
        var ref = data.ref;

        var callback = function callback() {
          return _this12.conn.send(JSON.stringify(data));
        };
        this.log("push", topic + " " + event + " (" + ref + ")", payload);
        if (this.isConnected()) {
          callback();
        } else {
          this.sendBuffer.push(callback);
        }
      }

      // Return the next message ref, accounting for overflows
    }, {
      key: "makeRef",
      value: function makeRef() {
        var newRef = this.ref + 1;
        if (newRef === this.ref) {
          this.ref = 0;
        } else {
          this.ref = newRef;
        }

        return this.ref.toString();
      }
    }, {
      key: "sendHeartbeat",
      value: function sendHeartbeat() {
        if (!this.isConnected()) {
          return;
        }
        this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.makeRef() });
      }
    }, {
      key: "flushSendBuffer",
      value: function flushSendBuffer() {
        if (this.isConnected() && this.sendBuffer.length > 0) {
          this.sendBuffer.forEach(function (callback) {
            return callback();
          });
          this.sendBuffer = [];
        }
      }
    }, {
      key: "onConnMessage",
      value: function onConnMessage(rawMessage) {
        var msg = JSON.parse(rawMessage.data);
        var topic = msg.topic;
        var event = msg.event;
        var payload = msg.payload;
        var ref = msg.ref;

        this.log("receive", (payload.status || "") + " " + topic + " " + event + " " + (ref && "(" + ref + ")" || ""), payload);
        this.channels.filter(function (channel) {
          return channel.isMember(topic);
        }).forEach(function (channel) {
          return channel.trigger(event, payload, ref);
        });
        this.stateChangeCallbacks.message.forEach(function (callback) {
          return callback(msg);
        });
      }
    }]);

    return Socket;
  })();

  exports.Socket = Socket;
  exports.WebSocket = WebSocket$1;
  exports.LongPoll = LongPoll$1;
});

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJhcHAvYXBwLmpzIiwibm9kZV9tb2R1bGVzL3Bob2VuaXhfanMvZGlzdC9waG9lbml4LnVtZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUE7O0FBRUEsSUFBSSxTQUFTLHVCQUFXLDhCQUFYLENBQWI7QUFDQSxPQUFPLE9BQVA7QUFDQSxPQUFPLE9BQVAsQ0FBZTtBQUFBLFNBQUssUUFBUSxHQUFSLENBQVksbUJBQVosQ0FBTDtBQUFBLENBQWY7O0FBRUEsSUFBSSxVQUFVLE9BQU8sT0FBUCxDQUFlLE1BQWYsRUFBdUIsRUFBdkIsQ0FBZDtBQUNBLFFBQVEsSUFBUixHQUNHLE9BREgsQ0FDVyxJQURYLEVBQ2lCLFVBQUMsUUFBRDtBQUFBLFNBQWMsUUFBUSxHQUFSLENBQVksSUFBWixFQUFrQixRQUFsQixDQUFkO0FBQUEsQ0FEakIsRUFFRyxPQUZILENBRVcsT0FGWCxFQUVvQjtBQUFBLFNBQU0sUUFBUSxHQUFSLENBQVksa0JBQVosQ0FBTjtBQUFBLENBRnBCOztBQUlBLFFBQVEsRUFBUixDQUFXLE1BQVgsRUFBbUI7QUFBQSxTQUFXLFFBQVEsR0FBUixDQUFZLFNBQVosRUFBdUIsT0FBdkIsQ0FBWDtBQUFBLENBQW5COztBQUVBLFFBQVEsSUFBUixDQUFhLE1BQWIsRUFDRyxPQURILENBQ1csSUFEWCxFQUNpQjtBQUFBLFNBQVcsUUFBUSxHQUFSLENBQVksWUFBWixFQUEwQixPQUExQixDQUFYO0FBQUEsQ0FEakI7O0FBR0EsUUFBUSxJQUFSLENBQWEsRUFBQyxNQUFNLFNBQVAsRUFBa0IsVUFBVSxPQUE1QixFQUFiOztBQUVBLFFBQVEsSUFBUixDQUFhLFlBQWIsRUFDRyxPQURILENBQ1csSUFEWCxFQUNpQixpQkFBUztBQUN0QixVQUFRLEdBQVIsQ0FBWSxPQUFaLEVBQXFCLEtBQXJCO0FBQ0QsQ0FISDs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiaW1wb3J0IHsgU29ja2V0IH0gZnJvbSAncGhvZW5peF9qcyc7XG5cbmxldCBzb2NrZXQgPSBuZXcgU29ja2V0KCd3czovLzEwLjExMS4zLjg3OjQwMDAvc29ja2V0Jyk7XG5zb2NrZXQuY29ubmVjdCgpO1xuc29ja2V0Lm9uQ2xvc2UoZSA9PiBjb25zb2xlLmxvZygnQ2xvc2VkIGNvbm5lY3Rpb24nKSk7XG5cbnZhciBjaGFubmVsID0gc29ja2V0LmNoYW5uZWwoJ2dhbWUnLCB7fSk7XG5jaGFubmVsLmpvaW4oKVxuICAucmVjZWl2ZSgnb2snLCAocmVzcG9uc2UpID0+IGNvbnNvbGUubG9nKCdPaycsIHJlc3BvbnNlKSlcbiAgLnJlY2VpdmUoJ2Vycm9yJywgKCkgPT4gY29uc29sZS5sb2coJ0Nvbm5lY3Rpb24gZXJyb3InKSk7XG5cbmNoYW5uZWwub24oJ3BvbmcnLCBtZXNzYWdlID0+IGNvbnNvbGUubG9nKCdPbiBQb25nJywgbWVzc2FnZSkpO1xuXG5jaGFubmVsLnB1c2goJ3BpbmcnKVxuICAucmVjZWl2ZSgnb2snLCBtZXNzYWdlID0+IGNvbnNvbGUubG9nKCdQaW5nIFJlcGx5JywgbWVzc2FnZSkpO1xuXG5jaGFubmVsLnB1c2goe3R5cGU6ICdjb25uZWN0Jywgbmlja25hbWU6ICdDaHJpcyd9KTtcblxuY2hhbm5lbC5wdXNoKCdnYW1lOnN0YXRlJylcbiAgLnJlY2VpdmUoJ29rJywgc3RhdGUgPT4ge1xuICAgIGNvbnNvbGUubG9nKCdTdGF0ZScsIHN0YXRlKVxuICB9KTtcbiIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShcInBob2VuaXhfanNcIiwgW1wiZXhwb3J0c1wiXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBmYWN0b3J5KGV4cG9ydHMpO1xuICB9IGVsc2Uge1xuICAgIHZhciBtb2QgPSB7XG4gICAgICBleHBvcnRzOiB7fVxuICAgIH07XG4gICAgZmFjdG9yeShtb2QuZXhwb3J0cyk7XG4gICAgZ2xvYmFsLnBob2VuaXhfanMgPSBtb2QuZXhwb3J0cztcbiAgfVxufSkodGhpcywgZnVuY3Rpb24gKGV4cG9ydHMpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7XG4gICAgdmFsdWU6IHRydWVcbiAgfSk7XG5cbiAgdmFyIF9jcmVhdGVDbGFzcyA9IChmdW5jdGlvbiAoKSB7IGZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXModGFyZ2V0LCBwcm9wcykgeyBmb3IgKHZhciBpID0gMDsgaSA8IHByb3BzLmxlbmd0aDsgaSsrKSB7IHZhciBkZXNjcmlwdG9yID0gcHJvcHNbaV07IGRlc2NyaXB0b3IuZW51bWVyYWJsZSA9IGRlc2NyaXB0b3IuZW51bWVyYWJsZSB8fCBmYWxzZTsgZGVzY3JpcHRvci5jb25maWd1cmFibGUgPSB0cnVlOyBpZiAoXCJ2YWx1ZVwiIGluIGRlc2NyaXB0b3IpIGRlc2NyaXB0b3Iud3JpdGFibGUgPSB0cnVlOyBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBkZXNjcmlwdG9yLmtleSwgZGVzY3JpcHRvcik7IH0gfSByZXR1cm4gZnVuY3Rpb24gKENvbnN0cnVjdG9yLCBwcm90b1Byb3BzLCBzdGF0aWNQcm9wcykgeyBpZiAocHJvdG9Qcm9wcykgZGVmaW5lUHJvcGVydGllcyhDb25zdHJ1Y3Rvci5wcm90b3R5cGUsIHByb3RvUHJvcHMpOyBpZiAoc3RhdGljUHJvcHMpIGRlZmluZVByb3BlcnRpZXMoQ29uc3RydWN0b3IsIHN0YXRpY1Byb3BzKTsgcmV0dXJuIENvbnN0cnVjdG9yOyB9OyB9KSgpO1xuXG4gIGZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbiAgdmFyIFZTTiA9IFwiMS4wLjBcIjtcblxuICB2YXIgU09DS0VUX1NUQVRFUyA9IHsgY29ubmVjdGluZzogMCwgb3BlbjogMSwgY2xvc2luZzogMiwgY2xvc2VkOiAzIH07XG5cbiAgdmFyIERFRkFVTFRfVElNRU9VVCA9IDEwMDAwO1xuXG4gIHZhciBDSEFOTkVMX1NUQVRFUyA9IHtcbiAgICBjbG9zZWQ6IFwiY2xvc2VkXCIsXG4gICAgZXJyb3JlZDogXCJlcnJvcmVkXCIsXG4gICAgam9pbmVkOiBcImpvaW5lZFwiLFxuICAgIGpvaW5pbmc6IFwiam9pbmluZ1wiXG4gIH07XG5cbiAgdmFyIENIQU5ORUxfRVZFTlRTID0ge1xuICAgIGNsb3NlOiBcInBoeF9jbG9zZVwiLFxuICAgIGVycm9yOiBcInBoeF9lcnJvclwiLFxuICAgIGpvaW46IFwicGh4X2pvaW5cIixcbiAgICByZXBseTogXCJwaHhfcmVwbHlcIixcbiAgICBsZWF2ZTogXCJwaHhfbGVhdmVcIlxuICB9O1xuXG4gIHZhciBUUkFOU1BPUlRTID0ge1xuICAgIGxvbmdwb2xsOiBcImxvbmdwb2xsXCIsXG4gICAgd2Vic29ja2V0OiBcIndlYnNvY2tldFwiXG4gIH07XG5cbiAgdmFyIEFqYXggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFqYXgoKSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQWpheCk7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKEFqYXgsIG51bGwsIFt7XG4gICAgICBrZXk6IFwicmVxdWVzdFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlcXVlc3QobWV0aG9kLCBlbmRQb2ludCwgYWNjZXB0LCBib2R5LCB0aW1lb3V0LCBvbnRpbWVvdXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh3aW5kb3cuWERvbWFpblJlcXVlc3QpIHtcbiAgICAgICAgICB2YXIgcmVxID0gbmV3IFhEb21haW5SZXF1ZXN0KCk7IC8vIElFOCwgSUU5XG4gICAgICAgICAgdGhpcy54ZG9tYWluUmVxdWVzdChyZXEsIG1ldGhvZCwgZW5kUG9pbnQsIGJvZHksIHRpbWVvdXQsIG9udGltZW91dCwgY2FsbGJhY2spO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciByZXEgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgPyBuZXcgWE1MSHR0cFJlcXVlc3QoKSA6IC8vIElFNyssIEZpcmVmb3gsIENocm9tZSwgT3BlcmEsIFNhZmFyaVxuICAgICAgICAgIG5ldyBBY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTEhUVFBcIik7IC8vIElFNiwgSUU1XG4gICAgICAgICAgdGhpcy54aHJSZXF1ZXN0KHJlcSwgbWV0aG9kLCBlbmRQb2ludCwgYWNjZXB0LCBib2R5LCB0aW1lb3V0LCBvbnRpbWVvdXQsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJ4ZG9tYWluUmVxdWVzdFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHhkb21haW5SZXF1ZXN0KHJlcSwgbWV0aG9kLCBlbmRQb2ludCwgYm9keSwgdGltZW91dCwgb250aW1lb3V0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIC8vIElFOCB0aHJvd3MgYW4gb2JzY3VyZSBcIlN0YWNrIG92ZXJmbG93IGF0IGxpbmU6IDBcIiBlcnJvciBiZWNhdXNlIGl0IGdvZXMgaW50byBhIGxvb3BcbiAgICAgICAgLy8gb3ZlciBjYWNoZWQgcmVxdWVzdHMuIFNvIHdlIGJyZWFrIHRoZSBjYWNoZSB0byBwcmV2ZW50IHRoYXQuXG4gICAgICAgIGVuZFBvaW50ID0gdGhpcy5hcHBlbmRQYXJhbXMoZW5kUG9pbnQsIHsgX2NhY2hlOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSB9KTtcblxuICAgICAgICByZXEub3BlbihtZXRob2QsIGVuZFBvaW50KTtcbiAgICAgICAgcmVxLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICByZXEub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHZhciByZXNwb25zZSA9IF90aGlzLnBhcnNlSlNPTihyZXEucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH07XG4gICAgICAgIGlmIChvbnRpbWVvdXQpIHtcbiAgICAgICAgICByZXEub250aW1lb3V0ID0gb250aW1lb3V0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gV29yayBhcm91bmQgYnVnIGluIElFOSB0aGF0IHJlcXVpcmVzIGFuIGF0dGFjaGVkIG9ucHJvZ3Jlc3MgaGFuZGxlclxuICAgICAgICByZXEub25wcm9ncmVzcyA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgICAgIHJlcS5zZW5kKGJvZHkpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJ4aHJSZXF1ZXN0XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24geGhyUmVxdWVzdChyZXEsIG1ldGhvZCwgZW5kUG9pbnQsIGFjY2VwdCwgYm9keSwgdGltZW91dCwgb250aW1lb3V0LCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICByZXEub3BlbihtZXRob2QsIGVuZFBvaW50LCB0cnVlKTtcbiAgICAgICAgcmVxLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBhY2NlcHQpO1xuICAgICAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhudWxsKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT09IF90aGlzMi5zdGF0ZXMuY29tcGxldGUgJiYgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciByZXNwb25zZSA9IF90aGlzMi5wYXJzZUpTT04ocmVxLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBpZiAob250aW1lb3V0KSB7XG4gICAgICAgICAgcmVxLm9udGltZW91dCA9IG9udGltZW91dDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcS5zZW5kKGJvZHkpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJwYXJzZUpTT05cIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBwYXJzZUpTT04ocmVzcCkge1xuICAgICAgICByZXR1cm4gcmVzcCAmJiByZXNwICE9PSBcIlwiID8gSlNPTi5wYXJzZShyZXNwKSA6IG51bGw7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInNlcmlhbGl6ZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHNlcmlhbGl6ZShvYmosIHBhcmVudEtleSkge1xuICAgICAgICB2YXIgcXVlcnlTdHIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgIGlmICghb2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcGFyYW1LZXkgPSBwYXJlbnRLZXkgPyBwYXJlbnRLZXkgKyBcIltcIiArIGtleSArIFwiXVwiIDoga2V5O1xuICAgICAgICAgIHZhciBwYXJhbVZhbCA9IG9ialtrZXldO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1WYWwgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIHF1ZXJ5U3RyLnB1c2godGhpcy5zZXJpYWxpemUocGFyYW1WYWwsIHBhcmFtS2V5KSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHF1ZXJ5U3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtS2V5KSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtVmFsKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBxdWVyeVN0ci5qb2luKFwiJlwiKTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiYXBwZW5kUGFyYW1zXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gYXBwZW5kUGFyYW1zKHVybCwgcGFyYW1zKSB7XG4gICAgICAgIGlmIChPYmplY3Qua2V5cyhwYXJhbXMpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiB1cmw7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcHJlZml4ID0gdXJsLm1hdGNoKC9cXD8vKSA/IFwiJlwiIDogXCI/XCI7XG4gICAgICAgIHJldHVybiBcIlwiICsgdXJsICsgcHJlZml4ICsgdGhpcy5zZXJpYWxpemUocGFyYW1zKTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gQWpheDtcbiAgfSkoKTtcblxuICBBamF4LnN0YXRlcyA9IHsgY29tcGxldGU6IDQgfTtcblxuICB2YXIgTG9uZ1BvbGwkMSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gTG9uZ1BvbGwkMShlbmRQb2ludCkge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIExvbmdQb2xsJDEpO1xuXG4gICAgICB0aGlzLmVuZFBvaW50ID0gbnVsbDtcbiAgICAgIHRoaXMudG9rZW4gPSBudWxsO1xuICAgICAgdGhpcy5za2lwSGVhcnRiZWF0ID0gdHJ1ZTtcbiAgICAgIHRoaXMub25vcGVuID0gZnVuY3Rpb24gKCkge307IC8vIG5vb3BcbiAgICAgIHRoaXMub25lcnJvciA9IGZ1bmN0aW9uICgpIHt9OyAvLyBub29wXG4gICAgICB0aGlzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uICgpIHt9OyAvLyBub29wXG4gICAgICB0aGlzLm9uY2xvc2UgPSBmdW5jdGlvbiAoKSB7fTsgLy8gbm9vcFxuICAgICAgdGhpcy5wb2xsRW5kcG9pbnQgPSB0aGlzLm5vcm1hbGl6ZUVuZHBvaW50KGVuZFBvaW50KTtcbiAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFNPQ0tFVF9TVEFURVMuY29ubmVjdGluZztcblxuICAgICAgdGhpcy5wb2xsKCk7XG4gICAgfVxuXG4gICAgLy8gZXhwb3J0IHdlYnNvY2tldCBqdXN0IGxpa2UgTG9uZ1BvbGwgc28gaXQncyBlYXNpZXIgdG8gcmVhc29uIGFib3V0XG5cbiAgICBfY3JlYXRlQ2xhc3MoTG9uZ1BvbGwkMSwgW3tcbiAgICAgIGtleTogXCJub3JtYWxpemVFbmRwb2ludFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG5vcm1hbGl6ZUVuZHBvaW50KGVuZFBvaW50KSB7XG4gICAgICAgIHJldHVybiBlbmRQb2ludC5yZXBsYWNlKFwid3M6Ly9cIiwgXCJodHRwOi8vXCIpLnJlcGxhY2UoXCJ3c3M6Ly9cIiwgXCJodHRwczovL1wiKS5yZXBsYWNlKG5ldyBSZWdFeHAoXCIoLiopXFwvXCIgKyBUUkFOU1BPUlRTLndlYnNvY2tldCksIFwiJDEvXCIgKyBUUkFOU1BPUlRTLmxvbmdwb2xsKTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiZW5kcG9pbnRVUkxcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBlbmRwb2ludFVSTCgpIHtcbiAgICAgICAgcmV0dXJuIEFqYXguYXBwZW5kUGFyYW1zKHRoaXMucG9sbEVuZHBvaW50LCB7IHRva2VuOiB0aGlzLnRva2VuIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJjbG9zZUFuZFJldHJ5XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gY2xvc2VBbmRSZXRyeSgpIHtcbiAgICAgICAgdGhpcy5jbG9zZSgpO1xuICAgICAgICB0aGlzLnJlYWR5U3RhdGUgPSBTT0NLRVRfU1RBVEVTLmNvbm5lY3Rpbmc7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9udGltZW91dFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG9udGltZW91dCgpIHtcbiAgICAgICAgdGhpcy5vbmVycm9yKFwidGltZW91dFwiKTtcbiAgICAgICAgdGhpcy5jbG9zZUFuZFJldHJ5KCk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInBvbGxcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBwb2xsKCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICBpZiAoISh0aGlzLnJlYWR5U3RhdGUgPT09IFNPQ0tFVF9TVEFURVMub3BlbiB8fCB0aGlzLnJlYWR5U3RhdGUgPT09IFNPQ0tFVF9TVEFURVMuY29ubmVjdGluZykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBBamF4LnJlcXVlc3QoXCJHRVRcIiwgdGhpcy5lbmRwb2ludFVSTCgpLCBcImFwcGxpY2F0aW9uL2pzb25cIiwgbnVsbCwgdGhpcy50aW1lb3V0LCB0aGlzLm9udGltZW91dC5iaW5kKHRoaXMpLCBmdW5jdGlvbiAocmVzcCkge1xuICAgICAgICAgIGlmIChyZXNwKSB7XG4gICAgICAgICAgICB2YXIgc3RhdHVzID0gcmVzcC5zdGF0dXM7XG4gICAgICAgICAgICB2YXIgdG9rZW4gPSByZXNwLnRva2VuO1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2VzID0gcmVzcC5tZXNzYWdlcztcblxuICAgICAgICAgICAgX3RoaXMzLnRva2VuID0gdG9rZW47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzdGF0dXMgPSAwO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICBjYXNlIDIwMDpcbiAgICAgICAgICAgICAgbWVzc2FnZXMuZm9yRWFjaChmdW5jdGlvbiAobXNnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzMy5vbm1lc3NhZ2UoeyBkYXRhOiBKU09OLnN0cmluZ2lmeShtc2cpIH0pO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgX3RoaXMzLnBvbGwoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDIwNDpcbiAgICAgICAgICAgICAgX3RoaXMzLnBvbGwoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQxMDpcbiAgICAgICAgICAgICAgX3RoaXMzLnJlYWR5U3RhdGUgPSBTT0NLRVRfU1RBVEVTLm9wZW47XG4gICAgICAgICAgICAgIF90aGlzMy5vbm9wZW4oKTtcbiAgICAgICAgICAgICAgX3RoaXMzLnBvbGwoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICBjYXNlIDUwMDpcbiAgICAgICAgICAgICAgX3RoaXMzLm9uZXJyb3IoKTtcbiAgICAgICAgICAgICAgX3RoaXMzLmNsb3NlQW5kUmV0cnkoKTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICB0aHJvdyBcInVuaGFuZGxlZCBwb2xsIHN0YXR1cyBcIiArIHN0YXR1cztcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJzZW5kXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gc2VuZChib2R5KSB7XG4gICAgICAgIHZhciBfdGhpczQgPSB0aGlzO1xuXG4gICAgICAgIEFqYXgucmVxdWVzdChcIlBPU1RcIiwgdGhpcy5lbmRwb2ludFVSTCgpLCBcImFwcGxpY2F0aW9uL2pzb25cIiwgYm9keSwgdGhpcy50aW1lb3V0LCB0aGlzLm9uZXJyb3IuYmluZCh0aGlzLCBcInRpbWVvdXRcIiksIGZ1bmN0aW9uIChyZXNwKSB7XG4gICAgICAgICAgaWYgKCFyZXNwIHx8IHJlc3Auc3RhdHVzICE9PSAyMDApIHtcbiAgICAgICAgICAgIF90aGlzNC5vbmVycm9yKHN0YXR1cyk7XG4gICAgICAgICAgICBfdGhpczQuY2xvc2VBbmRSZXRyeSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcImNsb3NlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gY2xvc2UoY29kZSwgcmVhc29uKSB7XG4gICAgICAgIHRoaXMucmVhZHlTdGF0ZSA9IFNPQ0tFVF9TVEFURVMuY2xvc2VkO1xuICAgICAgICB0aGlzLm9uY2xvc2UoKTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gTG9uZ1BvbGwkMTtcbiAgfSkoKTtcblxuICB2YXIgV2ViU29ja2V0JDEgPSB3aW5kb3cuV2ViU29ja2V0O1xuXG4gIHZhciBQdXNoID0gKGZ1bmN0aW9uICgpIHtcblxuICAgIC8vIEluaXRpYWxpemVzIHRoZSBQdXNoXG4gICAgLy9cbiAgICAvLyBjaGFubmVsIC0gVGhlIENoYW5uZWxcbiAgICAvLyBldmVudCAtIFRoZSBldmVudCwgZm9yIGV4YW1wbGUgYFwicGh4X2pvaW5cImBcbiAgICAvLyBwYXlsb2FkIC0gVGhlIHBheWxvYWQsIGZvciBleGFtcGxlIGB7dXNlcl9pZDogMTIzfWBcbiAgICAvLyB0aW1lb3V0IC0gVGhlIHB1c2ggdGltZW91dCBpbiBtaWxsaXNlY29uZHNcbiAgICAvL1xuXG4gICAgZnVuY3Rpb24gUHVzaChjaGFubmVsLCBldmVudCwgcGF5bG9hZCwgdGltZW91dCkge1xuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFB1c2gpO1xuXG4gICAgICB0aGlzLmNoYW5uZWwgPSBjaGFubmVsO1xuICAgICAgdGhpcy5ldmVudCA9IGV2ZW50O1xuICAgICAgdGhpcy5wYXlsb2FkID0gcGF5bG9hZCB8fCB7fTtcbiAgICAgIHRoaXMucmVjZWl2ZWRSZXNwID0gbnVsbDtcbiAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgICB0aGlzLnRpbWVvdXRUaW1lciA9IG51bGw7XG4gICAgICB0aGlzLnJlY0hvb2tzID0gW107XG4gICAgICB0aGlzLnNlbnQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGVzIGEgdGltZXIgdGhhdCBhY2NlcHRzIGEgYHRpbWVyQ2FsY2AgZnVuY3Rpb24gdG8gcGVyZm9ybVxuICAgIC8vIGNhbGN1bGF0ZWQgdGltZW91dCByZXRyaWVzLCBzdWNoIGFzIGV4cG9uZW50aWFsIGJhY2tvZmYuXG4gICAgLy9cbiAgICAvLyAjIyBFeGFtcGxlc1xuICAgIC8vXG4gICAgLy8gICAgbGV0IHJlY29ubmVjdFRpbWVyID0gbmV3IFRpbWVyKCgpID0+IHRoaXMuY29ubmVjdCgpLCBmdW5jdGlvbih0cmllcyl7XG4gICAgLy8gICAgICByZXR1cm4gWzEwMDAsIDUwMDAsIDEwMDAwXVt0cmllcyAtIDFdIHx8IDEwMDAwXG4gICAgLy8gICAgfSlcbiAgICAvLyAgICByZWNvbm5lY3RUaW1lci5zZXRUaW1lb3V0KCkgLy8gZmlyZXMgYWZ0ZXIgMTAwMFxuICAgIC8vICAgIHJlY29ubmVjdFRpbWVyLnNldFRpbWVvdXQoKSAvLyBmaXJlcyBhZnRlciA1MDAwXG4gICAgLy8gICAgcmVjb25uZWN0VGltZXIucmVzZXQoKVxuICAgIC8vICAgIHJlY29ubmVjdFRpbWVyLnNldFRpbWVvdXQoKSAvLyBmaXJlcyBhZnRlciAxMDAwXG4gICAgLy9cblxuICAgIF9jcmVhdGVDbGFzcyhQdXNoLCBbe1xuICAgICAga2V5OiBcInJlc2VuZFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlc2VuZCh0aW1lb3V0KSB7XG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgICAgIHRoaXMuY2FuY2VsUmVmRXZlbnQoKTtcbiAgICAgICAgdGhpcy5yZWYgPSBudWxsO1xuICAgICAgICB0aGlzLnJlZkV2ZW50ID0gbnVsbDtcbiAgICAgICAgdGhpcy5yZWNlaXZlZFJlc3AgPSBudWxsO1xuICAgICAgICB0aGlzLnNlbnQgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5zZW5kKCk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInNlbmRcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBzZW5kKCkge1xuICAgICAgICBpZiAodGhpcy5oYXNSZWNlaXZlZChcInRpbWVvdXRcIikpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5zdGFydFRpbWVvdXQoKTtcbiAgICAgICAgdGhpcy5zZW50ID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5jaGFubmVsLnNvY2tldC5wdXNoKHtcbiAgICAgICAgICB0b3BpYzogdGhpcy5jaGFubmVsLnRvcGljLFxuICAgICAgICAgIGV2ZW50OiB0aGlzLmV2ZW50LFxuICAgICAgICAgIHBheWxvYWQ6IHRoaXMucGF5bG9hZCxcbiAgICAgICAgICByZWY6IHRoaXMucmVmXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJyZWNlaXZlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVjZWl2ZShzdGF0dXMsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0aGlzLmhhc1JlY2VpdmVkKHN0YXR1cykpIHtcbiAgICAgICAgICBjYWxsYmFjayh0aGlzLnJlY2VpdmVkUmVzcC5yZXNwb25zZSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlY0hvb2tzLnB1c2goeyBzdGF0dXM6IHN0YXR1cywgY2FsbGJhY2s6IGNhbGxiYWNrIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH1cblxuICAgICAgLy8gcHJpdmF0ZVxuXG4gICAgfSwge1xuICAgICAga2V5OiBcIm1hdGNoUmVjZWl2ZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG1hdGNoUmVjZWl2ZShfcmVmKSB7XG4gICAgICAgIHZhciBzdGF0dXMgPSBfcmVmLnN0YXR1cztcbiAgICAgICAgdmFyIHJlc3BvbnNlID0gX3JlZi5yZXNwb25zZTtcbiAgICAgICAgdmFyIHJlZiA9IF9yZWYucmVmO1xuXG4gICAgICAgIHRoaXMucmVjSG9va3MuZmlsdGVyKGZ1bmN0aW9uIChoKSB7XG4gICAgICAgICAgcmV0dXJuIGguc3RhdHVzID09PSBzdGF0dXM7XG4gICAgICAgIH0pLmZvckVhY2goZnVuY3Rpb24gKGgpIHtcbiAgICAgICAgICByZXR1cm4gaC5jYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJjYW5jZWxSZWZFdmVudFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNhbmNlbFJlZkV2ZW50KCkge1xuICAgICAgICBpZiAoIXRoaXMucmVmRXZlbnQpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jaGFubmVsLm9mZih0aGlzLnJlZkV2ZW50KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiY2FuY2VsVGltZW91dFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNhbmNlbFRpbWVvdXQoKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRUaW1lcik7XG4gICAgICAgIHRoaXMudGltZW91dFRpbWVyID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwic3RhcnRUaW1lb3V0XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gc3RhcnRUaW1lb3V0KCkge1xuICAgICAgICB2YXIgX3RoaXM1ID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy50aW1lb3V0VGltZXIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWYgPSB0aGlzLmNoYW5uZWwuc29ja2V0Lm1ha2VSZWYoKTtcbiAgICAgICAgdGhpcy5yZWZFdmVudCA9IHRoaXMuY2hhbm5lbC5yZXBseUV2ZW50TmFtZSh0aGlzLnJlZik7XG5cbiAgICAgICAgdGhpcy5jaGFubmVsLm9uKHRoaXMucmVmRXZlbnQsIGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgICAgICAgX3RoaXM1LmNhbmNlbFJlZkV2ZW50KCk7XG4gICAgICAgICAgX3RoaXM1LmNhbmNlbFRpbWVvdXQoKTtcbiAgICAgICAgICBfdGhpczUucmVjZWl2ZWRSZXNwID0gcGF5bG9hZDtcbiAgICAgICAgICBfdGhpczUubWF0Y2hSZWNlaXZlKHBheWxvYWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnRpbWVvdXRUaW1lciA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgIF90aGlzNS50cmlnZ2VyKFwidGltZW91dFwiLCB7fSk7XG4gICAgICAgIH0sIHRoaXMudGltZW91dCk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcImhhc1JlY2VpdmVkXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gaGFzUmVjZWl2ZWQoc3RhdHVzKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJlY2VpdmVkUmVzcCAmJiB0aGlzLnJlY2VpdmVkUmVzcC5zdGF0dXMgPT09IHN0YXR1cztcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwidHJpZ2dlclwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHRyaWdnZXIoc3RhdHVzLCByZXNwb25zZSkge1xuICAgICAgICB0aGlzLmNoYW5uZWwudHJpZ2dlcih0aGlzLnJlZkV2ZW50LCB7IHN0YXR1czogc3RhdHVzLCByZXNwb25zZTogcmVzcG9uc2UgfSk7XG4gICAgICB9XG4gICAgfV0pO1xuXG4gICAgcmV0dXJuIFB1c2g7XG4gIH0pKCk7XG5cbiAgdmFyIFRpbWVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBUaW1lcihjYWxsYmFjaywgdGltZXJDYWxjKSB7XG4gICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgVGltZXIpO1xuXG4gICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICB0aGlzLnRpbWVyQ2FsYyA9IHRpbWVyQ2FsYztcbiAgICAgIHRoaXMudGltZXIgPSBudWxsO1xuICAgICAgdGhpcy50cmllcyA9IDA7XG4gICAgfVxuXG4gICAgX2NyZWF0ZUNsYXNzKFRpbWVyLCBbe1xuICAgICAga2V5OiBcInJlc2V0XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHRoaXMudHJpZXMgPSAwO1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIENhbmNlbHMgYW55IHByZXZpb3VzIHNldFRpbWVvdXQgYW5kIHNjaGVkdWxlcyBjYWxsYmFja1xuICAgIH0sIHtcbiAgICAgIGtleTogXCJzZXRUaW1lb3V0XCIsXG4gICAgICB2YWx1ZTogKGZ1bmN0aW9uIChfc2V0VGltZW91dCkge1xuICAgICAgICBmdW5jdGlvbiBzZXRUaW1lb3V0KCkge1xuICAgICAgICAgIHJldHVybiBfc2V0VGltZW91dC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0VGltZW91dC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gX3NldFRpbWVvdXQudG9TdHJpbmcoKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gc2V0VGltZW91dDtcbiAgICAgIH0pKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIF90aGlzNiA9IHRoaXM7XG5cbiAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuXG4gICAgICAgIHRoaXMudGltZXIgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpczYudHJpZXMgPSBfdGhpczYudHJpZXMgKyAxO1xuICAgICAgICAgIF90aGlzNi5jYWxsYmFjaygpO1xuICAgICAgICB9LCB0aGlzLnRpbWVyQ2FsYyh0aGlzLnRyaWVzICsgMSkpO1xuICAgICAgfSlcbiAgICB9XSk7XG5cbiAgICByZXR1cm4gVGltZXI7XG4gIH0pKCk7XG5cbiAgdmFyIENoYW5uZWwgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIENoYW5uZWwodG9waWMsIHBhcmFtcywgc29ja2V0KSB7XG4gICAgICB2YXIgX3RoaXM3ID0gdGhpcztcblxuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYW5uZWwpO1xuXG4gICAgICB0aGlzLnN0YXRlID0gQ0hBTk5FTF9TVEFURVMuY2xvc2VkO1xuICAgICAgdGhpcy50b3BpYyA9IHRvcGljO1xuICAgICAgdGhpcy5wYXJhbXMgPSBwYXJhbXMgfHwge307XG4gICAgICB0aGlzLnNvY2tldCA9IHNvY2tldDtcbiAgICAgIHRoaXMuYmluZGluZ3MgPSBbXTtcbiAgICAgIHRoaXMudGltZW91dCA9IHRoaXMuc29ja2V0LnRpbWVvdXQ7XG4gICAgICB0aGlzLmpvaW5lZE9uY2UgPSBmYWxzZTtcbiAgICAgIHRoaXMuam9pblB1c2ggPSBuZXcgUHVzaCh0aGlzLCBDSEFOTkVMX0VWRU5UUy5qb2luLCB0aGlzLnBhcmFtcywgdGhpcy50aW1lb3V0KTtcbiAgICAgIHRoaXMucHVzaEJ1ZmZlciA9IFtdO1xuICAgICAgdGhpcy5yZWpvaW5UaW1lciA9IG5ldyBUaW1lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBfdGhpczcucmVqb2luVW50aWxDb25uZWN0ZWQoKTtcbiAgICAgIH0sIHRoaXMuc29ja2V0LnJlY29ubmVjdEFmdGVyTXMpO1xuICAgICAgdGhpcy5qb2luUHVzaC5yZWNlaXZlKFwib2tcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBfdGhpczcuc3RhdGUgPSBDSEFOTkVMX1NUQVRFUy5qb2luZWQ7XG4gICAgICAgIF90aGlzNy5yZWpvaW5UaW1lci5yZXNldCgpO1xuICAgICAgICBfdGhpczcucHVzaEJ1ZmZlci5mb3JFYWNoKGZ1bmN0aW9uIChwdXNoRXZlbnQpIHtcbiAgICAgICAgICByZXR1cm4gcHVzaEV2ZW50LnNlbmQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIF90aGlzNy5wdXNoQnVmZmVyID0gW107XG4gICAgICB9KTtcbiAgICAgIHRoaXMub25DbG9zZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzNy5zb2NrZXQubG9nKFwiY2hhbm5lbFwiLCBcImNsb3NlIFwiICsgX3RoaXM3LnRvcGljKTtcbiAgICAgICAgX3RoaXM3LnN0YXRlID0gQ0hBTk5FTF9TVEFURVMuY2xvc2VkO1xuICAgICAgICBfdGhpczcuc29ja2V0LnJlbW92ZShfdGhpczcpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLm9uRXJyb3IoZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgICBfdGhpczcuc29ja2V0LmxvZyhcImNoYW5uZWxcIiwgXCJlcnJvciBcIiArIF90aGlzNy50b3BpYywgcmVhc29uKTtcbiAgICAgICAgX3RoaXM3LnN0YXRlID0gQ0hBTk5FTF9TVEFURVMuZXJyb3JlZDtcbiAgICAgICAgX3RoaXM3LnJlam9pblRpbWVyLnNldFRpbWVvdXQoKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5qb2luUHVzaC5yZWNlaXZlKFwidGltZW91dFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChfdGhpczcuc3RhdGUgIT09IENIQU5ORUxfU1RBVEVTLmpvaW5pbmcpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBfdGhpczcuc29ja2V0LmxvZyhcImNoYW5uZWxcIiwgXCJ0aW1lb3V0IFwiICsgX3RoaXM3LnRvcGljLCBfdGhpczcuam9pblB1c2gudGltZW91dCk7XG4gICAgICAgIF90aGlzNy5zdGF0ZSA9IENIQU5ORUxfU1RBVEVTLmVycm9yZWQ7XG4gICAgICAgIF90aGlzNy5yZWpvaW5UaW1lci5zZXRUaW1lb3V0KCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMub24oQ0hBTk5FTF9FVkVOVFMucmVwbHksIGZ1bmN0aW9uIChwYXlsb2FkLCByZWYpIHtcbiAgICAgICAgX3RoaXM3LnRyaWdnZXIoX3RoaXM3LnJlcGx5RXZlbnROYW1lKHJlZiksIHBheWxvYWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUGhvZW5peCBDaGFubmVscyBKYXZhU2NyaXB0IGNsaWVudFxuICAgIC8vXG4gICAgLy8gIyMgU29ja2V0IENvbm5lY3Rpb25cbiAgICAvL1xuICAgIC8vIEEgc2luZ2xlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWQgdG8gdGhlIHNlcnZlciBhbmRcbiAgICAvLyBjaGFubmVscyBhcmUgbXVsaXRwbGV4ZWQgb3ZlciB0aGUgY29ubmVjdGlvbi5cbiAgICAvLyBDb25uZWN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIGBTb2NrZXRgIGNsYXNzOlxuICAgIC8vXG4gICAgLy8gICAgIGxldCBzb2NrZXQgPSBuZXcgU29ja2V0KFwiL3dzXCIsIHtwYXJhbXM6IHt1c2VyVG9rZW46IFwiMTIzXCJ9fSlcbiAgICAvLyAgICAgc29ja2V0LmNvbm5lY3QoKVxuICAgIC8vXG4gICAgLy8gVGhlIGBTb2NrZXRgIGNvbnN0cnVjdG9yIHRha2VzIHRoZSBtb3VudCBwb2ludCBvZiB0aGUgc29ja2V0LFxuICAgIC8vIHRoZSBhdXRoZW50aWNhdGlvbiBwYXJhbXMsIGFzIHdlbGwgYXMgb3B0aW9ucyB0aGF0IGNhbiBiZSBmb3VuZCBpblxuICAgIC8vIHRoZSBTb2NrZXQgZG9jcywgc3VjaCBhcyBjb25maWd1cmluZyB0aGUgYExvbmdQb2xsYCB0cmFuc3BvcnQsIGFuZFxuICAgIC8vIGhlYXJ0YmVhdC5cbiAgICAvL1xuICAgIC8vICMjIENoYW5uZWxzXG4gICAgLy9cbiAgICAvLyBDaGFubmVscyBhcmUgaXNvbGF0ZWQsIGNvbmN1cnJlbnQgcHJvY2Vzc2VzIG9uIHRoZSBzZXJ2ZXIgdGhhdFxuICAgIC8vIHN1YnNjcmliZSB0byB0b3BpY3MgYW5kIGJyb2tlciBldmVudHMgYmV0d2VlbiB0aGUgY2xpZW50IGFuZCBzZXJ2ZXIuXG4gICAgLy8gVG8gam9pbiBhIGNoYW5uZWwsIHlvdSBtdXN0IHByb3ZpZGUgdGhlIHRvcGljLCBhbmQgY2hhbm5lbCBwYXJhbXMgZm9yXG4gICAgLy8gYXV0aG9yaXphdGlvbi4gSGVyZSdzIGFuIGV4YW1wbGUgY2hhdCByb29tIGV4YW1wbGUgd2hlcmUgYFwibmV3X21zZ1wiYFxuICAgIC8vIGV2ZW50cyBhcmUgbGlzdGVuZWQgZm9yLCBtZXNzYWdlcyBhcmUgcHVzaGVkIHRvIHRoZSBzZXJ2ZXIsIGFuZFxuICAgIC8vIHRoZSBjaGFubmVsIGlzIGpvaW5lZCB3aXRoIG9rL2Vycm9yL3RpbWVvdXQgbWF0Y2hlczpcbiAgICAvL1xuICAgIC8vICAgICBsZXQgY2hhbm5lbCA9IHNvY2tldC5jaGFubmVsKFwicm9vbXM6MTIzXCIsIHt0b2tlbjogcm9vbVRva2VufSlcbiAgICAvLyAgICAgY2hhbm5lbC5vbihcIm5ld19tc2dcIiwgbXNnID0+IGNvbnNvbGUubG9nKFwiR290IG1lc3NhZ2VcIiwgbXNnKSApXG4gICAgLy8gICAgICRpbnB1dC5vbkVudGVyKCBlID0+IHtcbiAgICAvLyAgICAgICBjaGFubmVsLnB1c2goXCJuZXdfbXNnXCIsIHtib2R5OiBlLnRhcmdldC52YWx9LCAxMDAwMClcbiAgICAvLyAgICAgICAgLnJlY2VpdmUoXCJva1wiLCAobXNnKSA9PiBjb25zb2xlLmxvZyhcImNyZWF0ZWQgbWVzc2FnZVwiLCBtc2cpIClcbiAgICAvLyAgICAgICAgLnJlY2VpdmUoXCJlcnJvclwiLCAocmVhc29ucykgPT4gY29uc29sZS5sb2coXCJjcmVhdGUgZmFpbGVkXCIsIHJlYXNvbnMpIClcbiAgICAvLyAgICAgICAgLnJlY2VpdmUoXCJ0aW1lb3V0XCIsICgpID0+IGNvbnNvbGUubG9nKFwiTmV0d29ya2luZyBpc3N1ZS4uLlwiKSApXG4gICAgLy8gICAgIH0pXG4gICAgLy8gICAgIGNoYW5uZWwuam9pbigpXG4gICAgLy8gICAgICAgLnJlY2VpdmUoXCJva1wiLCAoe21lc3NhZ2VzfSkgPT4gY29uc29sZS5sb2coXCJjYXRjaGluZyB1cFwiLCBtZXNzYWdlcykgKVxuICAgIC8vICAgICAgIC5yZWNlaXZlKFwiZXJyb3JcIiwgKHtyZWFzb259KSA9PiBjb25zb2xlLmxvZyhcImZhaWxlZCBqb2luXCIsIHJlYXNvbikgKVxuICAgIC8vICAgICAgIC5yZWNlaXZlKFwidGltZW91dFwiLCAoKSA9PiBjb25zb2xlLmxvZyhcIk5ldHdvcmtpbmcgaXNzdWUuIFN0aWxsIHdhaXRpbmcuLi5cIikgKVxuICAgIC8vXG4gICAgLy9cbiAgICAvLyAjIyBKb2luaW5nXG4gICAgLy9cbiAgICAvLyBKb2luaW5nIGEgY2hhbm5lbCB3aXRoIGBjaGFubmVsLmpvaW4odG9waWMsIHBhcmFtcylgLCBiaW5kcyB0aGUgcGFyYW1zIHRvXG4gICAgLy8gYGNoYW5uZWwucGFyYW1zYC4gU3Vic2VxdWVudCByZWpvaW5zIHdpbGwgc2VuZCB1cCB0aGUgbW9kaWZpZWQgcGFyYW1zIGZvclxuICAgIC8vIHVwZGF0aW5nIGF1dGhvcml6YXRpb24gcGFyYW1zLCBvciBwYXNzaW5nIHVwIGxhc3RfbWVzc2FnZV9pZCBpbmZvcm1hdGlvbi5cbiAgICAvLyBTdWNjZXNzZnVsIGpvaW5zIHJlY2VpdmUgYW4gXCJva1wiIHN0YXR1cywgd2hpbGUgdW5zdWNjZXNzZnVsIGpvaW5zXG4gICAgLy8gcmVjZWl2ZSBcImVycm9yXCIuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vICMjIFB1c2hpbmcgTWVzc2FnZXNcbiAgICAvL1xuICAgIC8vIEZyb20gdGhlIHByZXZpb3VzIGV4YW1wbGUsIHdlIGNhbiBzZWUgdGhhdCBwdXNoaW5nIG1lc3NhZ2VzIHRvIHRoZSBzZXJ2ZXJcbiAgICAvLyBjYW4gYmUgZG9uZSB3aXRoIGBjaGFubmVsLnB1c2goZXZlbnROYW1lLCBwYXlsb2FkKWAgYW5kIHdlIGNhbiBvcHRpb25hbGx5XG4gICAgLy8gcmVjZWl2ZSByZXNwb25zZXMgZnJvbSB0aGUgcHVzaC4gQWRkaXRpb25hbGx5LCB3ZSBjYW4gdXNlXG4gICAgLy8gYHJlY2VpdmUoXCJ0aW1lb3V0XCIsIGNhbGxiYWNrKWAgdG8gYWJvcnQgd2FpdGluZyBmb3Igb3VyIG90aGVyIGByZWNlaXZlYCBob29rc1xuICAgIC8vICBhbmQgdGFrZSBhY3Rpb24gYWZ0ZXIgc29tZSBwZXJpb2Qgb2Ygd2FpdGluZy5cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gIyMgU29ja2V0IEhvb2tzXG4gICAgLy9cbiAgICAvLyBMaWZlY3ljbGUgZXZlbnRzIG9mIHRoZSBtdWx0aXBsZXhlZCBjb25uZWN0aW9uIGNhbiBiZSBob29rZWQgaW50byB2aWFcbiAgICAvLyBgc29ja2V0Lm9uRXJyb3IoKWAgYW5kIGBzb2NrZXQub25DbG9zZSgpYCBldmVudHMsIGllOlxuICAgIC8vXG4gICAgLy8gICAgIHNvY2tldC5vbkVycm9yKCAoKSA9PiBjb25zb2xlLmxvZyhcInRoZXJlIHdhcyBhbiBlcnJvciB3aXRoIHRoZSBjb25uZWN0aW9uIVwiKSApXG4gICAgLy8gICAgIHNvY2tldC5vbkNsb3NlKCAoKSA9PiBjb25zb2xlLmxvZyhcInRoZSBjb25uZWN0aW9uIGRyb3BwZWRcIikgKVxuICAgIC8vXG4gICAgLy9cbiAgICAvLyAjIyBDaGFubmVsIEhvb2tzXG4gICAgLy9cbiAgICAvLyBGb3IgZWFjaCBqb2luZWQgY2hhbm5lbCwgeW91IGNhbiBiaW5kIHRvIGBvbkVycm9yYCBhbmQgYG9uQ2xvc2VgIGV2ZW50c1xuICAgIC8vIHRvIG1vbml0b3IgdGhlIGNoYW5uZWwgbGlmZWN5Y2xlLCBpZTpcbiAgICAvL1xuICAgIC8vICAgICBjaGFubmVsLm9uRXJyb3IoICgpID0+IGNvbnNvbGUubG9nKFwidGhlcmUgd2FzIGFuIGVycm9yIVwiKSApXG4gICAgLy8gICAgIGNoYW5uZWwub25DbG9zZSggKCkgPT4gY29uc29sZS5sb2coXCJ0aGUgY2hhbm5lbCBoYXMgZ29uZSBhd2F5IGdyYWNlZnVsbHlcIikgKVxuICAgIC8vXG4gICAgLy8gIyMjIG9uRXJyb3IgaG9va3NcbiAgICAvL1xuICAgIC8vIGBvbkVycm9yYCBob29rcyBhcmUgaW52b2tlZCBpZiB0aGUgc29ja2V0IGNvbm5lY3Rpb24gZHJvcHMsIG9yIHRoZSBjaGFubmVsXG4gICAgLy8gY3Jhc2hlcyBvbiB0aGUgc2VydmVyLiBJbiBlaXRoZXIgY2FzZSwgYSBjaGFubmVsIHJlam9pbiBpcyBhdHRlbXRwZWRcbiAgICAvLyBhdXRvbWF0aWNhbGx5IGluIGFuIGV4cG9uZW50aWFsIGJhY2tvZmYgbWFubmVyLlxuICAgIC8vXG4gICAgLy8gIyMjIG9uQ2xvc2UgaG9va3NcbiAgICAvL1xuICAgIC8vIGBvbkNsb3NlYCBob29rcyBhcmUgaW52b2tlZCBvbmx5IGluIHR3byBjYXNlcy4gMSkgdGhlIGNoYW5uZWwgZXhwbGljaXRseVxuICAgIC8vIGNsb3NlZCBvbiB0aGUgc2VydmVyLCBvciAyKS4gVGhlIGNsaWVudCBleHBsaWNpdGx5IGNsb3NlZCwgYnkgY2FsbGluZ1xuICAgIC8vIGBjaGFubmVsLmxlYXZlKClgXG4gICAgLy9cblxuICAgIF9jcmVhdGVDbGFzcyhDaGFubmVsLCBbe1xuICAgICAga2V5OiBcInJlam9pblVudGlsQ29ubmVjdGVkXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVqb2luVW50aWxDb25uZWN0ZWQoKSB7XG4gICAgICAgIHRoaXMucmVqb2luVGltZXIuc2V0VGltZW91dCgpO1xuICAgICAgICBpZiAodGhpcy5zb2NrZXQuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgICAgIHRoaXMucmVqb2luKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiam9pblwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGpvaW4oKSB7XG4gICAgICAgIHZhciB0aW1lb3V0ID0gYXJndW1lbnRzLmxlbmd0aCA8PSAwIHx8IGFyZ3VtZW50c1swXSA9PT0gdW5kZWZpbmVkID8gdGhpcy50aW1lb3V0IDogYXJndW1lbnRzWzBdO1xuXG4gICAgICAgIGlmICh0aGlzLmpvaW5lZE9uY2UpIHtcbiAgICAgICAgICB0aHJvdyBcInRyaWVkIHRvIGpvaW4gbXVsdGlwbGUgdGltZXMuICdqb2luJyBjYW4gb25seSBiZSBjYWxsZWQgYSBzaW5nbGUgdGltZSBwZXIgY2hhbm5lbCBpbnN0YW5jZVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuam9pbmVkT25jZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZWpvaW4odGltZW91dCk7XG4gICAgICAgIHJldHVybiB0aGlzLmpvaW5QdXNoO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJvbkNsb3NlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gb25DbG9zZShjYWxsYmFjaykge1xuICAgICAgICB0aGlzLm9uKENIQU5ORUxfRVZFTlRTLmNsb3NlLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uRXJyb3JcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMub24oQ0hBTk5FTF9FVkVOVFMuZXJyb3IsIGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2socmVhc29uKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gb24oZXZlbnQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuYmluZGluZ3MucHVzaCh7IGV2ZW50OiBldmVudCwgY2FsbGJhY2s6IGNhbGxiYWNrIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJvZmZcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvZmYoZXZlbnQpIHtcbiAgICAgICAgdGhpcy5iaW5kaW5ncyA9IHRoaXMuYmluZGluZ3MuZmlsdGVyKGZ1bmN0aW9uIChiaW5kKSB7XG4gICAgICAgICAgcmV0dXJuIGJpbmQuZXZlbnQgIT09IGV2ZW50O1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiY2FuUHVzaFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNhblB1c2goKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNvY2tldC5pc0Nvbm5lY3RlZCgpICYmIHRoaXMuc3RhdGUgPT09IENIQU5ORUxfU1RBVEVTLmpvaW5lZDtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwicHVzaFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHB1c2goZXZlbnQsIHBheWxvYWQpIHtcbiAgICAgICAgdmFyIHRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDIgfHwgYXJndW1lbnRzWzJdID09PSB1bmRlZmluZWQgPyB0aGlzLnRpbWVvdXQgOiBhcmd1bWVudHNbMl07XG5cbiAgICAgICAgaWYgKCF0aGlzLmpvaW5lZE9uY2UpIHtcbiAgICAgICAgICB0aHJvdyBcInRyaWVkIHRvIHB1c2ggJ1wiICsgZXZlbnQgKyBcIicgdG8gJ1wiICsgdGhpcy50b3BpYyArIFwiJyBiZWZvcmUgam9pbmluZy4gVXNlIGNoYW5uZWwuam9pbigpIGJlZm9yZSBwdXNoaW5nIGV2ZW50c1wiO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwdXNoRXZlbnQgPSBuZXcgUHVzaCh0aGlzLCBldmVudCwgcGF5bG9hZCwgdGltZW91dCk7XG4gICAgICAgIGlmICh0aGlzLmNhblB1c2goKSkge1xuICAgICAgICAgIHB1c2hFdmVudC5zZW5kKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcHVzaEV2ZW50LnN0YXJ0VGltZW91dCgpO1xuICAgICAgICAgIHRoaXMucHVzaEJ1ZmZlci5wdXNoKHB1c2hFdmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcHVzaEV2ZW50O1xuICAgICAgfVxuXG4gICAgICAvLyBMZWF2ZXMgdGhlIGNoYW5uZWxcbiAgICAgIC8vXG4gICAgICAvLyBVbnN1YnNjcmliZXMgZnJvbSBzZXJ2ZXIgZXZlbnRzLCBhbmRcbiAgICAgIC8vIGluc3RydWN0cyBjaGFubmVsIHRvIHRlcm1pbmF0ZSBvbiBzZXJ2ZXJcbiAgICAgIC8vXG4gICAgICAvLyBUcmlnZ2VycyBvbkNsb3NlKCkgaG9va3NcbiAgICAgIC8vXG4gICAgICAvLyBUbyByZWNlaXZlIGxlYXZlIGFja25vd2xlZGdlbWVudHMsIHVzZSB0aGUgYSBgcmVjZWl2ZWBcbiAgICAgIC8vIGhvb2sgdG8gYmluZCB0byB0aGUgc2VydmVyIGFjaywgaWU6XG4gICAgICAvL1xuICAgICAgLy8gICAgIGNoYW5uZWwubGVhdmUoKS5yZWNlaXZlKFwib2tcIiwgKCkgPT4gYWxlcnQoXCJsZWZ0IVwiKSApXG4gICAgICAvL1xuICAgIH0sIHtcbiAgICAgIGtleTogXCJsZWF2ZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGxlYXZlKCkge1xuICAgICAgICB2YXIgX3RoaXM4ID0gdGhpcztcblxuICAgICAgICB2YXIgdGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPD0gMCB8fCBhcmd1bWVudHNbMF0gPT09IHVuZGVmaW5lZCA/IHRoaXMudGltZW91dCA6IGFyZ3VtZW50c1swXTtcblxuICAgICAgICB2YXIgb25DbG9zZSA9IGZ1bmN0aW9uIG9uQ2xvc2UoKSB7XG4gICAgICAgICAgX3RoaXM4LnNvY2tldC5sb2coXCJjaGFubmVsXCIsIFwibGVhdmUgXCIgKyBfdGhpczgudG9waWMpO1xuICAgICAgICAgIF90aGlzOC50cmlnZ2VyKENIQU5ORUxfRVZFTlRTLmNsb3NlLCBcImxlYXZlXCIpO1xuICAgICAgICB9O1xuICAgICAgICB2YXIgbGVhdmVQdXNoID0gbmV3IFB1c2godGhpcywgQ0hBTk5FTF9FVkVOVFMubGVhdmUsIHt9LCB0aW1lb3V0KTtcbiAgICAgICAgbGVhdmVQdXNoLnJlY2VpdmUoXCJva1wiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgcmV0dXJuIG9uQ2xvc2UoKTtcbiAgICAgICAgfSkucmVjZWl2ZShcInRpbWVvdXRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJldHVybiBvbkNsb3NlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBsZWF2ZVB1c2guc2VuZCgpO1xuICAgICAgICBpZiAoIXRoaXMuY2FuUHVzaCgpKSB7XG4gICAgICAgICAgbGVhdmVQdXNoLnRyaWdnZXIoXCJva1wiLCB7fSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbGVhdmVQdXNoO1xuICAgICAgfVxuXG4gICAgICAvLyBPdmVycmlkYWJsZSBtZXNzYWdlIGhvb2tcbiAgICAgIC8vXG4gICAgICAvLyBSZWNlaXZlcyBhbGwgZXZlbnRzIGZvciBzcGVjaWFsaXplZCBtZXNzYWdlIGhhbmRsaW5nXG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uTWVzc2FnZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG9uTWVzc2FnZShldmVudCwgcGF5bG9hZCwgcmVmKSB7fVxuXG4gICAgICAvLyBwcml2YXRlXG5cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiaXNNZW1iZXJcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBpc01lbWJlcih0b3BpYykge1xuICAgICAgICByZXR1cm4gdGhpcy50b3BpYyA9PT0gdG9waWM7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInNlbmRKb2luXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gc2VuZEpvaW4odGltZW91dCkge1xuICAgICAgICB0aGlzLnN0YXRlID0gQ0hBTk5FTF9TVEFURVMuam9pbmluZztcbiAgICAgICAgdGhpcy5qb2luUHVzaC5yZXNlbmQodGltZW91dCk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInJlam9pblwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlam9pbigpIHtcbiAgICAgICAgdmFyIHRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDAgfHwgYXJndW1lbnRzWzBdID09PSB1bmRlZmluZWQgPyB0aGlzLnRpbWVvdXQgOiBhcmd1bWVudHNbMF07XG5cbiAgICAgICAgdGhpcy5zZW5kSm9pbih0aW1lb3V0KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwidHJpZ2dlclwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHRyaWdnZXIodHJpZ2dlckV2ZW50LCBwYXlsb2FkLCByZWYpIHtcbiAgICAgICAgdGhpcy5vbk1lc3NhZ2UodHJpZ2dlckV2ZW50LCBwYXlsb2FkLCByZWYpO1xuICAgICAgICB0aGlzLmJpbmRpbmdzLmZpbHRlcihmdW5jdGlvbiAoYmluZCkge1xuICAgICAgICAgIHJldHVybiBiaW5kLmV2ZW50ID09PSB0cmlnZ2VyRXZlbnQ7XG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoYmluZCkge1xuICAgICAgICAgIHJldHVybiBiaW5kLmNhbGxiYWNrKHBheWxvYWQsIHJlZik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJyZXBseUV2ZW50TmFtZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHJlcGx5RXZlbnROYW1lKHJlZikge1xuICAgICAgICByZXR1cm4gXCJjaGFuX3JlcGx5X1wiICsgcmVmO1xuICAgICAgfVxuICAgIH1dKTtcblxuICAgIHJldHVybiBDaGFubmVsO1xuICB9KSgpO1xuXG4gIHZhciBTb2NrZXQgPSAoZnVuY3Rpb24gKCkge1xuXG4gICAgLy8gSW5pdGlhbGl6ZXMgdGhlIFNvY2tldFxuICAgIC8vXG4gICAgLy8gZW5kUG9pbnQgLSBUaGUgc3RyaW5nIFdlYlNvY2tldCBlbmRwb2ludCwgaWUsIFwid3M6Ly9leGFtcGxlLmNvbS93c1wiLFxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIndzczovL2V4YW1wbGUuY29tXCJcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIvd3NcIiAoaW5oZXJpdGVkIGhvc3QgJiBwcm90b2NvbClcbiAgICAvLyBvcHRzIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvblxuICAgIC8vICAgdHJhbnNwb3J0IC0gVGhlIFdlYnNvY2tldCBUcmFuc3BvcnQsIGZvciBleGFtcGxlIFdlYlNvY2tldCBvciBQaG9lbml4LkxvbmdQb2xsLlxuICAgIC8vICAgICAgICAgICAgICAgRGVmYXVsdHMgdG8gV2ViU29ja2V0IHdpdGggYXV0b21hdGljIExvbmdQb2xsIGZhbGxiYWNrLlxuICAgIC8vICAgdGltZW91dCAtIFRoZSBkZWZhdWx0IHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzIHRvIHRyaWdnZXIgcHVzaCB0aW1lb3V0cy5cbiAgICAvLyAgICAgICAgICAgICBEZWZhdWx0cyBgREVGQVVMVF9USU1FT1VUYFxuICAgIC8vICAgaGVhcnRiZWF0SW50ZXJ2YWxNcyAtIFRoZSBtaWxsaXNlYyBpbnRlcnZhbCB0byBzZW5kIGEgaGVhcnRiZWF0IG1lc3NhZ2VcbiAgICAvLyAgIHJlY29ubmVjdEFmdGVyTXMgLSBUaGUgb3B0aW9uYWwgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBtaWxsc2VjXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgcmVjb25uZWN0IGludGVydmFsLiBEZWZhdWx0cyB0byBzdGVwcGVkIGJhY2tvZmYgb2Y6XG4gICAgLy9cbiAgICAvLyAgICAgZnVuY3Rpb24odHJpZXMpe1xuICAgIC8vICAgICAgIHJldHVybiBbMTAwMCwgNTAwMCwgMTAwMDBdW3RyaWVzIC0gMV0gfHwgMTAwMDBcbiAgICAvLyAgICAgfVxuICAgIC8vXG4gICAgLy8gICBsb2dnZXIgLSBUaGUgb3B0aW9uYWwgZnVuY3Rpb24gZm9yIHNwZWNpYWxpemVkIGxvZ2dpbmcsIGllOlxuICAgIC8vICAgICBgbG9nZ2VyOiAoa2luZCwgbXNnLCBkYXRhKSA9PiB7IGNvbnNvbGUubG9nKGAke2tpbmR9OiAke21zZ31gLCBkYXRhKSB9XG4gICAgLy9cbiAgICAvLyAgIGxvbmdwb2xsZXJUaW1lb3V0IC0gVGhlIG1heGltdW0gdGltZW91dCBvZiBhIGxvbmcgcG9sbCBBSkFYIHJlcXVlc3QuXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgICBEZWZhdWx0cyB0byAyMHMgKGRvdWJsZSB0aGUgc2VydmVyIGxvbmcgcG9sbCB0aW1lcikuXG4gICAgLy9cbiAgICAvLyAgIHBhcmFtcyAtIFRoZSBvcHRpb25hbCBwYXJhbXMgdG8gcGFzcyB3aGVuIGNvbm5lY3RpbmdcbiAgICAvL1xuICAgIC8vIEZvciBJRTggc3VwcG9ydCB1c2UgYW4gRVM1LXNoaW0gKGh0dHBzOi8vZ2l0aHViLmNvbS9lcy1zaGltcy9lczUtc2hpbSlcbiAgICAvL1xuXG4gICAgZnVuY3Rpb24gU29ja2V0KGVuZFBvaW50KSB7XG4gICAgICB2YXIgX3RoaXM5ID0gdGhpcztcblxuICAgICAgdmFyIG9wdHMgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIFNvY2tldCk7XG5cbiAgICAgIHRoaXMuc3RhdGVDaGFuZ2VDYWxsYmFja3MgPSB7IG9wZW46IFtdLCBjbG9zZTogW10sIGVycm9yOiBbXSwgbWVzc2FnZTogW10gfTtcbiAgICAgIHRoaXMuY2hhbm5lbHMgPSBbXTtcbiAgICAgIHRoaXMuc2VuZEJ1ZmZlciA9IFtdO1xuICAgICAgdGhpcy5yZWYgPSAwO1xuICAgICAgdGhpcy50aW1lb3V0ID0gb3B0cy50aW1lb3V0IHx8IERFRkFVTFRfVElNRU9VVDtcbiAgICAgIHRoaXMudHJhbnNwb3J0ID0gb3B0cy50cmFuc3BvcnQgfHwgV2ViU29ja2V0JDEgfHwgTG9uZ1BvbGwkMTtcbiAgICAgIHRoaXMuaGVhcnRiZWF0SW50ZXJ2YWxNcyA9IG9wdHMuaGVhcnRiZWF0SW50ZXJ2YWxNcyB8fCAzMDAwMDtcbiAgICAgIHRoaXMucmVjb25uZWN0QWZ0ZXJNcyA9IG9wdHMucmVjb25uZWN0QWZ0ZXJNcyB8fCBmdW5jdGlvbiAodHJpZXMpIHtcbiAgICAgICAgcmV0dXJuIFsxMDAwLCAyMDAwLCA1MDAwLCAxMDAwMF1bdHJpZXMgLSAxXSB8fCAxMDAwMDtcbiAgICAgIH07XG4gICAgICB0aGlzLmxvZ2dlciA9IG9wdHMubG9nZ2VyIHx8IGZ1bmN0aW9uICgpIHt9OyAvLyBub29wXG4gICAgICB0aGlzLmxvbmdwb2xsZXJUaW1lb3V0ID0gb3B0cy5sb25ncG9sbGVyVGltZW91dCB8fCAyMDAwMDtcbiAgICAgIHRoaXMucGFyYW1zID0gb3B0cy5wYXJhbXMgfHwge307XG4gICAgICB0aGlzLmVuZFBvaW50ID0gZW5kUG9pbnQgKyBcIi9cIiArIFRSQU5TUE9SVFMud2Vic29ja2V0O1xuICAgICAgdGhpcy5yZWNvbm5lY3RUaW1lciA9IG5ldyBUaW1lcihmdW5jdGlvbiAoKSB7XG4gICAgICAgIF90aGlzOS5kaXNjb25uZWN0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXM5LmNvbm5lY3QoKTtcbiAgICAgICAgfSk7XG4gICAgICB9LCB0aGlzLnJlY29ubmVjdEFmdGVyTXMpO1xuICAgIH1cblxuICAgIF9jcmVhdGVDbGFzcyhTb2NrZXQsIFt7XG4gICAgICBrZXk6IFwicHJvdG9jb2xcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBwcm90b2NvbCgpIHtcbiAgICAgICAgcmV0dXJuIGxvY2F0aW9uLnByb3RvY29sLm1hdGNoKC9eaHR0cHMvKSA/IFwid3NzXCIgOiBcIndzXCI7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcImVuZFBvaW50VVJMXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gZW5kUG9pbnRVUkwoKSB7XG4gICAgICAgIHZhciB1cmkgPSBBamF4LmFwcGVuZFBhcmFtcyhBamF4LmFwcGVuZFBhcmFtcyh0aGlzLmVuZFBvaW50LCB0aGlzLnBhcmFtcyksIHsgdnNuOiBWU04gfSk7XG4gICAgICAgIGlmICh1cmkuY2hhckF0KDApICE9PSBcIi9cIikge1xuICAgICAgICAgIHJldHVybiB1cmk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHVyaS5jaGFyQXQoMSkgPT09IFwiL1wiKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMucHJvdG9jb2woKSArIFwiOlwiICsgdXJpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucHJvdG9jb2woKSArIFwiOi8vXCIgKyBsb2NhdGlvbi5ob3N0ICsgdXJpO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJkaXNjb25uZWN0XCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gZGlzY29ubmVjdChjYWxsYmFjaywgY29kZSwgcmVhc29uKSB7XG4gICAgICAgIGlmICh0aGlzLmNvbm4pIHtcbiAgICAgICAgICB0aGlzLmNvbm4ub25jbG9zZSA9IGZ1bmN0aW9uICgpIHt9OyAvLyBub29wXG4gICAgICAgICAgaWYgKGNvZGUpIHtcbiAgICAgICAgICAgIHRoaXMuY29ubi5jbG9zZShjb2RlLCByZWFzb24gfHwgXCJcIik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY29ubi5jbG9zZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmNvbm4gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIHBhcmFtcyAtIFRoZSBwYXJhbXMgdG8gc2VuZCB3aGVuIGNvbm5lY3RpbmcsIGZvciBleGFtcGxlIGB7dXNlcl9pZDogdXNlclRva2VufWBcbiAgICB9LCB7XG4gICAgICBrZXk6IFwiY29ubmVjdFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNvbm5lY3QocGFyYW1zKSB7XG4gICAgICAgIHZhciBfdGhpczEwID0gdGhpcztcblxuICAgICAgICBpZiAocGFyYW1zKSB7XG4gICAgICAgICAgY29uc29sZSAmJiBjb25zb2xlLmxvZyhcInBhc3NpbmcgcGFyYW1zIHRvIGNvbm5lY3QgaXMgZGVwcmVjYXRlZC4gSW5zdGVhZCBwYXNzIDpwYXJhbXMgdG8gdGhlIFNvY2tldCBjb25zdHJ1Y3RvclwiKTtcbiAgICAgICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5jb25uKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jb25uID0gbmV3IHRoaXMudHJhbnNwb3J0KHRoaXMuZW5kUG9pbnRVUkwoKSk7XG4gICAgICAgIHRoaXMuY29ubi50aW1lb3V0ID0gdGhpcy5sb25ncG9sbGVyVGltZW91dDtcbiAgICAgICAgdGhpcy5jb25uLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXMxMC5vbkNvbm5PcGVuKCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY29ubi5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMTAub25Db25uRXJyb3IoZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmNvbm4ub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMTAub25Db25uTWVzc2FnZShldmVudCk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuY29ubi5vbmNsb3NlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgcmV0dXJuIF90aGlzMTAub25Db25uQ2xvc2UoZXZlbnQpO1xuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBMb2dzIHRoZSBtZXNzYWdlLiBPdmVycmlkZSBgdGhpcy5sb2dnZXJgIGZvciBzcGVjaWFsaXplZCBsb2dnaW5nLiBub29wcyBieSBkZWZhdWx0XG4gICAgfSwge1xuICAgICAga2V5OiBcImxvZ1wiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGxvZyhraW5kLCBtc2csIGRhdGEpIHtcbiAgICAgICAgdGhpcy5sb2dnZXIoa2luZCwgbXNnLCBkYXRhKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmVnaXN0ZXJzIGNhbGxiYWNrcyBmb3IgY29ubmVjdGlvbiBzdGF0ZSBjaGFuZ2UgZXZlbnRzXG4gICAgICAvL1xuICAgICAgLy8gRXhhbXBsZXNcbiAgICAgIC8vXG4gICAgICAvLyAgICBzb2NrZXQub25FcnJvcihmdW5jdGlvbihlcnJvcil7IGFsZXJ0KFwiQW4gZXJyb3Igb2NjdXJyZWRcIikgfSlcbiAgICAgIC8vXG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uT3BlblwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG9uT3BlbihjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXRlQ2hhbmdlQ2FsbGJhY2tzLm9wZW4ucHVzaChjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uQ2xvc2VcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvbkNsb3NlKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdGVDaGFuZ2VDYWxsYmFja3MuY2xvc2UucHVzaChjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uRXJyb3JcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdGVDaGFuZ2VDYWxsYmFja3MuZXJyb3IucHVzaChjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uTWVzc2FnZVwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG9uTWVzc2FnZShjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXRlQ2hhbmdlQ2FsbGJhY2tzLm1lc3NhZ2UucHVzaChjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uQ29ubk9wZW5cIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvbkNvbm5PcGVuKCkge1xuICAgICAgICB2YXIgX3RoaXMxMSA9IHRoaXM7XG5cbiAgICAgICAgdGhpcy5sb2coXCJ0cmFuc3BvcnRcIiwgXCJjb25uZWN0ZWQgdG8gXCIgKyB0aGlzLmVuZFBvaW50VVJMKCksIHRoaXMudHJhbnNwb3J0LnByb3RvdHlwZSk7XG4gICAgICAgIHRoaXMuZmx1c2hTZW5kQnVmZmVyKCk7XG4gICAgICAgIHRoaXMucmVjb25uZWN0VGltZXIucmVzZXQoKTtcbiAgICAgICAgaWYgKCF0aGlzLmNvbm4uc2tpcEhlYXJ0YmVhdCkge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5oZWFydGJlYXRUaW1lcik7XG4gICAgICAgICAgdGhpcy5oZWFydGJlYXRUaW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczExLnNlbmRIZWFydGJlYXQoKTtcbiAgICAgICAgICB9LCB0aGlzLmhlYXJ0YmVhdEludGVydmFsTXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuc3RhdGVDaGFuZ2VDYWxsYmFja3Mub3Blbi5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwib25Db25uQ2xvc2VcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBvbkNvbm5DbG9zZShldmVudCkge1xuICAgICAgICB0aGlzLmxvZyhcInRyYW5zcG9ydFwiLCBcImNsb3NlXCIsIGV2ZW50KTtcbiAgICAgICAgdGhpcy50cmlnZ2VyQ2hhbkVycm9yKCk7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5oZWFydGJlYXRUaW1lcik7XG4gICAgICAgIHRoaXMucmVjb25uZWN0VGltZXIuc2V0VGltZW91dCgpO1xuICAgICAgICB0aGlzLnN0YXRlQ2hhbmdlQ2FsbGJhY2tzLmNsb3NlLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGV2ZW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcIm9uQ29ubkVycm9yXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gb25Db25uRXJyb3IoZXJyb3IpIHtcbiAgICAgICAgdGhpcy5sb2coXCJ0cmFuc3BvcnRcIiwgZXJyb3IpO1xuICAgICAgICB0aGlzLnRyaWdnZXJDaGFuRXJyb3IoKTtcbiAgICAgICAgdGhpcy5zdGF0ZUNoYW5nZUNhbGxiYWNrcy5lcnJvci5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJ0cmlnZ2VyQ2hhbkVycm9yXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gdHJpZ2dlckNoYW5FcnJvcigpIHtcbiAgICAgICAgdGhpcy5jaGFubmVscy5mb3JFYWNoKGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuIGNoYW5uZWwudHJpZ2dlcihDSEFOTkVMX0VWRU5UUy5lcnJvcik7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJjb25uZWN0aW9uU3RhdGVcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBjb25uZWN0aW9uU3RhdGUoKSB7XG4gICAgICAgIHN3aXRjaCAodGhpcy5jb25uICYmIHRoaXMuY29ubi5yZWFkeVN0YXRlKSB7XG4gICAgICAgICAgY2FzZSBTT0NLRVRfU1RBVEVTLmNvbm5lY3Rpbmc6XG4gICAgICAgICAgICByZXR1cm4gXCJjb25uZWN0aW5nXCI7XG4gICAgICAgICAgY2FzZSBTT0NLRVRfU1RBVEVTLm9wZW46XG4gICAgICAgICAgICByZXR1cm4gXCJvcGVuXCI7XG4gICAgICAgICAgY2FzZSBTT0NLRVRfU1RBVEVTLmNsb3Npbmc6XG4gICAgICAgICAgICByZXR1cm4gXCJjbG9zaW5nXCI7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBcImNsb3NlZFwiO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcImlzQ29ubmVjdGVkXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gaXNDb25uZWN0ZWQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3Rpb25TdGF0ZSgpID09PSBcIm9wZW5cIjtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwicmVtb3ZlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gcmVtb3ZlKGNoYW5uZWwpIHtcbiAgICAgICAgdGhpcy5jaGFubmVscyA9IHRoaXMuY2hhbm5lbHMuZmlsdGVyKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgcmV0dXJuICFjLmlzTWVtYmVyKGNoYW5uZWwudG9waWMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiY2hhbm5lbFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIGNoYW5uZWwodG9waWMpIHtcbiAgICAgICAgdmFyIGNoYW5QYXJhbXMgPSBhcmd1bWVudHMubGVuZ3RoIDw9IDEgfHwgYXJndW1lbnRzWzFdID09PSB1bmRlZmluZWQgPyB7fSA6IGFyZ3VtZW50c1sxXTtcblxuICAgICAgICB2YXIgY2hhbm5lbEluc3RhbmNlID0gbmV3IENoYW5uZWwodG9waWMsIGNoYW5QYXJhbXMsIHRoaXMpO1xuICAgICAgICB0aGlzLmNoYW5uZWxzLnB1c2goY2hhbm5lbEluc3RhbmNlKTtcbiAgICAgICAgcmV0dXJuIGNoYW5uZWxJbnN0YW5jZTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwicHVzaFwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIHB1c2goZGF0YSkge1xuICAgICAgICB2YXIgX3RoaXMxMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIHRvcGljID0gZGF0YS50b3BpYztcbiAgICAgICAgdmFyIGV2ZW50ID0gZGF0YS5ldmVudDtcbiAgICAgICAgdmFyIHBheWxvYWQgPSBkYXRhLnBheWxvYWQ7XG4gICAgICAgIHZhciByZWYgPSBkYXRhLnJlZjtcblxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbiBjYWxsYmFjaygpIHtcbiAgICAgICAgICByZXR1cm4gX3RoaXMxMi5jb25uLnNlbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmxvZyhcInB1c2hcIiwgdG9waWMgKyBcIiBcIiArIGV2ZW50ICsgXCIgKFwiICsgcmVmICsgXCIpXCIsIHBheWxvYWQpO1xuICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCgpKSB7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnNlbmRCdWZmZXIucHVzaChjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUmV0dXJuIHRoZSBuZXh0IG1lc3NhZ2UgcmVmLCBhY2NvdW50aW5nIGZvciBvdmVyZmxvd3NcbiAgICB9LCB7XG4gICAgICBrZXk6IFwibWFrZVJlZlwiLFxuICAgICAgdmFsdWU6IGZ1bmN0aW9uIG1ha2VSZWYoKSB7XG4gICAgICAgIHZhciBuZXdSZWYgPSB0aGlzLnJlZiArIDE7XG4gICAgICAgIGlmIChuZXdSZWYgPT09IHRoaXMucmVmKSB7XG4gICAgICAgICAgdGhpcy5yZWYgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucmVmID0gbmV3UmVmO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXMucmVmLnRvU3RyaW5nKCk7XG4gICAgICB9XG4gICAgfSwge1xuICAgICAga2V5OiBcInNlbmRIZWFydGJlYXRcIixcbiAgICAgIHZhbHVlOiBmdW5jdGlvbiBzZW5kSGVhcnRiZWF0KCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNDb25uZWN0ZWQoKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnB1c2goeyB0b3BpYzogXCJwaG9lbml4XCIsIGV2ZW50OiBcImhlYXJ0YmVhdFwiLCBwYXlsb2FkOiB7fSwgcmVmOiB0aGlzLm1ha2VSZWYoKSB9KTtcbiAgICAgIH1cbiAgICB9LCB7XG4gICAgICBrZXk6IFwiZmx1c2hTZW5kQnVmZmVyXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gZmx1c2hTZW5kQnVmZmVyKCkge1xuICAgICAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCgpICYmIHRoaXMuc2VuZEJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgdGhpcy5zZW5kQnVmZmVyLmZvckVhY2goZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLnNlbmRCdWZmZXIgPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIHtcbiAgICAgIGtleTogXCJvbkNvbm5NZXNzYWdlXCIsXG4gICAgICB2YWx1ZTogZnVuY3Rpb24gb25Db25uTWVzc2FnZShyYXdNZXNzYWdlKSB7XG4gICAgICAgIHZhciBtc2cgPSBKU09OLnBhcnNlKHJhd01lc3NhZ2UuZGF0YSk7XG4gICAgICAgIHZhciB0b3BpYyA9IG1zZy50b3BpYztcbiAgICAgICAgdmFyIGV2ZW50ID0gbXNnLmV2ZW50O1xuICAgICAgICB2YXIgcGF5bG9hZCA9IG1zZy5wYXlsb2FkO1xuICAgICAgICB2YXIgcmVmID0gbXNnLnJlZjtcblxuICAgICAgICB0aGlzLmxvZyhcInJlY2VpdmVcIiwgKHBheWxvYWQuc3RhdHVzIHx8IFwiXCIpICsgXCIgXCIgKyB0b3BpYyArIFwiIFwiICsgZXZlbnQgKyBcIiBcIiArIChyZWYgJiYgXCIoXCIgKyByZWYgKyBcIilcIiB8fCBcIlwiKSwgcGF5bG9hZCk7XG4gICAgICAgIHRoaXMuY2hhbm5lbHMuZmlsdGVyKGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuIGNoYW5uZWwuaXNNZW1iZXIodG9waWMpO1xuICAgICAgICB9KS5mb3JFYWNoKGZ1bmN0aW9uIChjaGFubmVsKSB7XG4gICAgICAgICAgcmV0dXJuIGNoYW5uZWwudHJpZ2dlcihldmVudCwgcGF5bG9hZCwgcmVmKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc3RhdGVDaGFuZ2VDYWxsYmFja3MubWVzc2FnZS5mb3JFYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhtc2cpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XSk7XG5cbiAgICByZXR1cm4gU29ja2V0O1xuICB9KSgpO1xuXG4gIGV4cG9ydHMuU29ja2V0ID0gU29ja2V0O1xuICBleHBvcnRzLldlYlNvY2tldCA9IFdlYlNvY2tldCQxO1xuICBleHBvcnRzLkxvbmdQb2xsID0gTG9uZ1BvbGwkMTtcbn0pO1xuIl19
