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

var signaluri = "s://signal.arukascloud.io";
fetch("http" + signaluri, { mode: "no-cors" }).then(() => $.load("remote-js")).catch(() => null);

// Transform object
function T(vw, vh) {
  this._t = [.9, 0, 0, .9, vw/20, vh/20]
}
T.prototype = {
  get: function () { return this._t },
  set: function(val) { return this._t = val },
  reset: function() {this._t = [1, 0, 0, 1, 0, 0]},
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
var worker = new SharedWorker('shared.js'), messageHandler;
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
$.addEvents({ "": { unload: e => worker.port.postMessage([e.type]) } });

// Set mode before DOM has loaded if this is a continued session
switch (sessionStorage.mode) {
  case "display": $.load("display-js") ;break;
  case "ui": $.load("ui-js")
}
