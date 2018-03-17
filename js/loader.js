// Utilities

//   $ enhances querySelectorAll
//     @param {String} sel - CSS-style node selector
//     @param {ParentNode} [node = document] - Optional selector root

function $(sel, node) { return Array.prototype.slice.call( (node || document).querySelectorAll(sel) ) }


//   $.addEvents enhances addEventListener
//     @param {Object} obj
//     - Takes the following form: { "selector": { "event1 event2": function listener () {} } }
//     - A selector of "" targets both the window and document objects
//     @param {ParentNode} [node = document] - Optional selector root

$.addEvents = function (obj, node) {
  for (var q in obj) for (var e in obj[q])
    for (var ns = q ? $(q, node) : [window, document], es = e.split(" "), i = 0; i < es.length; i++)
      typeof ns === "undefined" || ns.forEach(n => n.addEventListener(es[i], obj[q][e].bind(n)))
};


//   $.load appends a template to the body

$.load = function (id) { document.body.appendChild(document.importNode($("#" + id)[0].content, true)) };


// Initialise mode for this client

// TODO: Webcam theme - requires physical alpha, eg. green screen - use dropper
// TODO: Fix controls, add glow slider, etc
// If I coupled two feColorMatrix nodes together would I be able to get "pulsing"?
// TODO: Save/reload transform settings

var signaluri = "s://ajh-signal.herokuapp.com";

// TODO: Test prefixed "RTCPeerConnection" in window as well -> inform user of fallback behaviour
fetch("http" + signaluri, { mode: "no-cors" }).then(() => $.load("remote-js")).catch(() => null);

// Transform object
function T(vw, vh) {
  this._t = [.9, 0, 0, .9, vw/20, vh/20]
}
T.prototype = {
  get: function () { return this._t },
  set: function(val) { return this._t = val },
  reset: function() {this._t = [1, 0, 0, 1, 0, 0]},
  /*
  THE BIBLE:
  a = a2 * a1 + c2 * b1;
  b = b2 * a1 + d2 * b1;
  c = a2 * c1 + c2 * d1;
  d = b2 * c1 + d2 * d1;
  e = a2 * e1 + c2 * f1 + e2;
  f = b2 * e1 + d2 * f1 + f2;
  */
  translate: function (x, y) {
    this._t[4] -= x;
    this._t[5] -= y;
    return this._t
  },
  rotate: function (theta, x, y) {
    let s = Math.sin(theta), c = Math.cos(theta), t = this._t.slice(0), tx = t[4] - x, ty = t[5] - y;
    return this._t = [t[0]*c - t[1]*s, t[1]*c + t[0]*s, t[2]*c - t[3]*s, t[3]*c + t[2]*s, tx*c - ty*s + x, tx*s + ty*c + y];
  },
  scale: function (abs, x, y) {
    let t = this._t.slice(0);
    return this._t = [t[0]*abs, t[1]*abs, t[2]*abs, t[3]*abs, (t[4] - x)*abs + x, (t[5] - y)*abs + y]
  },
  scale2d: function (px, py, x, y) {
    let t = this._t.slice(0);
    return this._t = [t[0]*px, t[1]*px, t[2]*py, t[3]*py, (t[4] - x)*px + x, (t[5] - y)*py + y]
  },
  shearX: function (px, py, x, y) {
    let t = this._t.slice(0), ty = t[5] - y;
    return this._t = [t[0], t[1]*py, t[2] + t[3]*(1 - px), t[3]*py, t[4] + ty*(1 - px), ty*py + y]
  },
  shearY: function (px, py, x, y) {
    let t = this._t.slice(0), tx = t[4] - x;
    return this._t = [t[0]*px, t[0]*(1 - py) + t[1], t[2]*px, t[2]*(1 - py) + t[3], tx*px + x, tx*(1 - py) + t[5]]
  },
  skewRotate: function (abs, theta, x, y) {/*
    let t = this._t.slice(0), tx = t[4] - x, ty = t[5] - y,
        th = (Math.PI/2 - Math.acos(1/abs - 1))/2, sk = Math.cos(th), sc = Math.sin(th);
    return this._t = [t[0]*sk + t[1]*sc, t[0]*sc + t[1]*sk, t[2]*sk + t[3]*sc, t[2]*sc + t[3]*sk,
      tx*sk + ty*sc + x, tx*sc + ty*sk + y]*/
  },
  constructor: T
}
var transform;

// Inter-window port object
function AppPort() {
  this._jobs = [];
  this._ready = false;
  this.remote = false;
  this.localPort = null;
  this.remotePort = null
}
AppPort.prototype = {
  send: function (val) {
    if (val.constructor.name !== "String") val = JSON.stringify(val);
    let port = this.remote ? this.remotePort : this.localPort;
    this._ready ? port.postMessage(val) : this._jobs.push(val)
  },
  setPort: function (port, isRemote = false) {
    this.remote = isRemote;
    isRemote ? (this.remotePort = port) : (this.localPort = port);
    this._ready = true;
    while (this._jobs.length) port.postMessage(this._jobs.pop());
    return port
  }
}
var appPort = new AppPort();

// Connect to worker and other tab
var messageHandler;
if ("SharedWorker" in window) { // TODO: inform user of fallback behaviour
  var worker = new SharedWorker('js/shared.js');
  worker.port.onmessage = e => {
    switch (e.data) {
      case "display": $.load("display-js") ;break;
      case "ui": $.load("ui-js") ;break;
      case "outofrange":
      $("body")[0].classList.add("modal-active");
      $.load("outofrange") ;break;
      default:
      if (appPort.remotePort && !appPort.localPort) break;
      (appPort.setPort(e.data)).onmessage = e => messageHandler(e);
      $("body")[0].classList.remove("modal-active");
    }
  };
  worker.port.postMessage(["load", sessionStorage.mode]);
  $.addEvents({ "": { unload: e => worker.port.postMessage([e.type]) } })
} else $.load("display-js");

// Set mode before DOM has loaded if this is a continued session
switch (sessionStorage.mode) {
  case "display": $.load("display-js") ;break;
  case "ui": $.load("ui-js")
}
