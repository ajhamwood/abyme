
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
}


// Initialise mode for this client

function initDisplay() {
  var data = JSON.parse(sessionStorage.data = sessionStorage.data || "{}");
  $("body")[0].appendChild(document.importNode($("#display")[0].content, true));
  messageHandler = e => {
    if (e.data == "getdata") appPort.send(Object.assign(data, {theme: sessionStorage.theme}));
    else if ("menu" in e.data) {
      if ("theme" in e.data.menu) loop = loops[sessionStorage.theme = e.data.menu.theme]
    }
    else sessionStorage.data = JSON.stringify(
      data = Object.assign(data, { transform: transform.set(e.data.transform) })
    )
  };

  var canvas = $("#content")[0], context = canvas.getContext("2d"),
      buffer1 = document.createElement("canvas"), bufcon1 = buffer1.getContext("2d"),
      buffer2 = document.createElement("canvas"), bufcon2 = buffer2.getContext("2d"),
      loop, loops, vw, vh;

  sessionStorage.mode = "display";
  sessionStorage.theme = sessionStorage.theme || "black";

  function resize() {
    // TODO: wait until end of resize to redraw?
    var img1 = new Image(canvas.width, canvas.height), d1 = canvas.toDataURL(),
        img2 = new Image(buffer1.width, buffer1.height), d2 = buffer1.toDataURL();
        img3 = new Image(buffer2.width, buffer2.height), d3 = buffer2.toDataURL();
    img1.src = d1;
    img2.src = d2;
    img3.src = d3;
    canvas.width = buffer1.width = buffer2.width = vw = canvas.clientWidth;
    canvas.height = buffer1.height = buffer2.height = vh = canvas.clientHeight;
    img1.onload = () => context.drawImage(img1, 0, 0);
    img2.onload = () => bufcon1.drawImage(img2, 0, 0);
    img3.onload = () => bufcon2.drawImage(img3, 0, 0);

    data.dimensions = [vw, vh];
    transform = new T(vw, vh);
    if (data.transform) {
      transform.set(data.transform);
      appPort.send(data)
    } else {
      data.transform = transform.get();
      appPort.send("getdata")
    }
    sessionStorage.data = JSON.stringify(data);
  }
  resize();
  $.addEvents({ "": { resize: e => { e.stopPropagation(); resize() } } });

  (loop = (loops = {
    white: () => {
      context.fillStyle = "#fff";
      return (() => {
        context.fillRect(0, 0, vw, vh);
        context.setTransform.apply(context, transform.get());
        context.globalCompositeOperation = "difference";
        context.drawImage(buffer1, 0, 0, vw, vh);
        bufcon1.drawImage(canvas, 0, 0, vw, vh);
        context.resetTransform();
        context.globalCompositeOperation = "source-over";
        window.requestAnimationFrame(loop)
      })()
    },
    black: () => {
      context.fillStyle = "#fff";
      return (() => {
        context.fillRect(0, 0, vw, vh);
        context.setTransform.apply(context, transform.get());
        context.globalCompositeOperation = "difference";
        context.drawImage(buffer1, 0, 0, vw, vh);
        bufcon1.drawImage(canvas, 0, 0, vw, vh);
        context.resetTransform();
        context.fillRect(0, 0, vw, vh);
        context.globalCompositeOperation = "source-over";
        window.requestAnimationFrame(loop)
      })()
    },
    glow: () => {
      context.fillStyle = "#000";
      return (() => {
        context.fillRect(0, 0, vw, vh);
        context.setTransform.apply(context, transform.get());
        context.filter = "url(#glow)";
        context.drawImage(buffer1, 0, 0, vw, vh);
        context.filter = "none";
        bufcon1.drawImage(canvas, 0, 0, vw, vh);
        context.resetTransform();
        window.requestAnimationFrame(loop)
      })()
    },
    mirrorwhite: () => {
      bufcon2.scale(-1, 1);
      context.fillStyle = "#fff";
      return (() => {
        let hvw = Math.floor(vw/2);
        context.fillRect(0, 0, vw, vh);
        context.transform.apply(context, transform.get());
        context.globalCompositeOperation = "difference";
        context.drawImage(buffer1, 0, 0, vw, vh);
        bufcon1.drawImage(canvas, 0, 0, hvw, vh, 0, 0, hvw, vh);
        bufcon2.drawImage(canvas, 0, 0, hvw, vh, 0, 0, -hvw, vh);
        bufcon1.drawImage(buffer2, 0, 0, hvw, vh, hvw, 0, hvw, vh);
        context.resetTransform();
        context.globalCompositeOperation = "source-over";
        context.drawImage(buffer1, 0, 0, vw, vh);
        window.requestAnimationFrame(loop)
      })()
    },
    mirrorblack: () => {
      bufcon2.scale(-1, 1);
      context.fillStyle = "#fff";
      return (() => {
        let hvw = Math.floor(vw/2);
        context.fillRect(0, 0, vw, vh);
        context.transform.apply(context, transform.get());
        context.globalCompositeOperation = "difference";
        context.drawImage(buffer1, 0, 0, vw, vh);
        bufcon1.drawImage(canvas, 0, 0, hvw, vh, 0, 0, hvw, vh);
        bufcon2.drawImage(canvas, 0, 0, hvw, vh, 0, 0, -hvw, vh);
        bufcon1.drawImage(buffer2, 0, 0, hvw, vh, hvw, 0, hvw, vh);
        context.resetTransform();
        context.globalCompositeOperation = "source-over";
        context.drawImage(buffer1, 0, 0, vw, vh);
        context.globalCompositeOperation = "difference";
        context.fillRect(0, 0, vw, vh);
        context.globalCompositeOperation = "source-over";
        window.requestAnimationFrame(loop)
      })()
    },
    mirrorglow: () => {
      bufcon2.scale(-1, 1);
      context.fillStyle = "#000";
      return (() => {
        let hvw = Math.floor(vw/2);
        context.fillRect(0, 0, vw, vh);
        context.transform.apply(context, transform.get());
        context.filter = "url(#glow)";
        context.drawImage(buffer1, 0, 0, vw, vh);
        context.filter = "none";
        bufcon1.drawImage(canvas, 0, 0, hvw, vh, 0, 0, hvw, vh);
        bufcon2.drawImage(canvas, 0, 0, hvw, vh, 0, 0, -hvw, vh);
        bufcon1.drawImage(buffer2, 0, 0, hvw, vh, hvw, 0, hvw, vh);
        context.resetTransform();
        context.drawImage(buffer1, 0, 0, vw, vh);
        window.requestAnimationFrame(loop)
      })()
    }
  })[sessionStorage.theme])()
}

function initUI() {
  sessionStorage.mode = "ui";
  sessionStorage.data = sessionStorage.data || "{}";
  $("body")[0].appendChild(document.importNode($("#ui")[0].content, true));
  appPort.send("getdata");
  let vw, vh, data;
  if ((data = JSON.parse(sessionStorage.data)) && data.dimensions) {
    [vw, vh] = data.dimensions;
    transform = new T(vw, vh)
  }

  function showTransform() {
    let t = transform.get();
        points = [[0, 0], [0, vh], [vw, vh], [vw, 0]]
          .map(([x, y]) => [t[0]*x + t[2]*y + t[4], t[1]*x + t[3]*y + t[5]])
          .join(" ");
    $("polygon")[0].setAttribute("points", points);
    $("circle").forEach(c => {
      let [x, y] = c.id.slice(1).split("").map((v, i) => v*[vw, vh][i]);
      c.setAttribute("cx", t[0]*x + t[2]*y + t[4]);
      c.setAttribute("cy", t[1]*x + t[3]*y + t[5])
    })
  }

  messageHandler = e => {
    if (e.data == "getdata" && sessionStorage.data != "{}")
      return appPort.send({transform: JSON.parse(sessionStorage.data).transform});
    if ("theme" in e.data) {
      sessionStorage.theme = e.data.theme;
      delete e.data.theme;
      $("#theme-options > .selected")[0].classList.remove("selected");
      $("#theme-options > [data-theme=" + sessionStorage.theme + "]")[0].classList.add("selected");
    }
    sessionStorage.data = JSON.stringify(Object.assign(data, e.data));
    [vw, vh] = data.dimensions;
    transform = new T(vw, vh);
    transform.set(data.transform);
    $("svg")[0].setAttribute("viewBox", [-.5*vw, -.5*vh, 2*vw, 2*vh].join(" "))
    let ext = $("rect")[0];
    ext.setAttribute("width", vw);
    ext.setAttribute("height", vh);
    showTransform()
  };

  let mouse, keyboard = [];
  $.addEvents({
    "": {
      keydown: e => {
        e.stopPropagation();
        if (e.key == "Shift" || e.key == "Control") keyboard.push(e.key)
      },
      keyup: e => {
        e.stopPropagation();
        if (e.key == "Shift" || e.key == "Control") keyboard.splice(keyboard.indexOf(e.key), 1)
      },
      mousemove: e => {
        // TODO: Change to: No key = translation, Shift = scale & rotation, Control = shear & aspect?
        // TODO: Separate out into functions
        if (!mouse) return;
        let viewbox = $("svg")[0].viewBox.baseVal,
            bounds = $("svg")[0].getBoundingClientRect(),
            aspectComp = bounds.height/bounds.width > viewbox.height/viewbox.width,
            scale = [bounds.height/viewbox.height, bounds.width/viewbox.width][+aspectComp],
            origin = [
              (1 - aspectComp) * (bounds.width - viewbox.width * scale) / 2 - viewbox.x * scale + bounds.left,
              aspectComp * (bounds.height - viewbox.height * scale) / 2 - viewbox.y * scale + bounds.top
            ],
            premid = [$("rect")[0].width.baseVal.value / 2, $("rect")[0].height.baseVal.value / 2],
            t = transform.get(),
            midpoint = [t[0]*premid[0] + t[2]*premid[1] + t[4], t[1]*premid[0] + t[3]*premid[1] + t[5]];
        if (keyboard.indexOf("Shift") != -1) {
          let preangle = Math.atan2((mouse[1] - origin[1]) / scale - midpoint[1], (mouse[0] - origin[0]) / scale - midpoint[0]),
              rot = Math.atan2((e.clientY - origin[1]) / scale - midpoint[1], (e.clientX - origin[0]) / scale - midpoint[0]) - preangle,
              s = Math.sin(rot), c = Math.cos(rot),
              tx = midpoint[0] - midpoint[0]*c + midpoint[1]*s,
              ty = midpoint[1] - midpoint[0]*s - midpoint[1]*c;
          t = [t[0]*c + t[2]*s, t[1]*c + t[3]*s, t[2]*c - t[0]*s, t[3]*c - t[1]*s,
            t[0]*tx + t[2]*ty + t[4], t[1]*tx + t[3]*ty + t[5]];
          if (keyboard.indexOf("Control") != -1) {
            let preabs = Math.sqrt(Math.pow((mouse[0] - origin[0]) / scale - midpoint[0], 2) +
                  Math.pow((mouse[1] - origin[1]) / scale - midpoint[1], 2)),
                abs = Math.sqrt(Math.pow((e.clientX - origin[0]) / scale - midpoint[0], 2) +
                  Math.pow((e.clientY - origin[1]) / scale - midpoint[1], 2)) / preabs,
                tx = midpoint[0] * (1 - abs), ty = midpoint[1] * (1 - abs);
            t = [t[0]*abs, t[1]*abs, t[2]*abs, t[3]*abs, t[0]*tx + t[2]*ty + t[4], t[1]*tx + t[3]*ty + t[5]]
          }
        } else if (keyboard.indexOf("Control") != -1) {
          let prevec = [(mouse[0] - origin[0]) / scale - midpoint[0], (mouse[1] - origin[1]) / scale - midpoint[1]],
              vec = [((e.clientX - origin[0]) / scale - midpoint[0]) / prevec[0], ((e.clientY - origin[1]) / scale - midpoint[1]) / prevec[1]],
              tx = midpoint[0] * (1 - vec[0]), ty = midpoint[1] * (1 - vec[1]);
          t = [t[0]*vec[0], t[1]*vec[0], t[2]*vec[1], t[3]*vec[1], t[0]*tx + t[2]*ty + t[4], t[1]*tx + t[3]*ty + t[5]]
        } else {
          t[4] -= (mouse[0] - e.clientX) / scale;
          t[5] -= (mouse[1] - e.clientY) / scale
        }
        mouse = [e.clientX, e.clientY];
        sessionStorage.data = JSON.stringify(Object.assign(JSON.parse(sessionStorage.data), {transform: transform.set(t)}));
        appPort.send({transform: t});
        showTransform()
      },
      mouseup: e => mouse = null
    },
    polygon: { mousedown: e => mouse = [e.clientX, e.clientY] },
    "#menu": {
      mouseenter: function () {
        this.dataset.active = "";
        $("nav")[0].classList.add("active")
      },
      mouseleave: function () {
        this.removeAttribute("data-active")
        setTimeout(() => "active" in this.dataset || $("nav")[0].classList.remove("active"), 200)
      }
    },
    "#menu-options": {
      mouseenter: function () { $("#menu")[0].dataset.active = "" },
      mouseleave: function () {
        $("#menu")[0].removeAttribute("data-active");
        setTimeout(() => "active" in $("#menu")[0].dataset || $("nav")[0].classList.remove("active"), 200)
      }
    },
    "#menu-options > :not([id$=-options])": {
      mouseenter: function () {
        this.dataset.active = "";
        this.classList.add("active")
      },
      mouseleave: function () {
        this.removeAttribute("data-active")
        setTimeout(() => "active" in this.dataset || this.classList.remove("active"), 200)
      }
    },
    "#menu-options > [id$=-options]": {
      mouseenter: function () { $("#" + this.id.slice(0, -8))[0].dataset.active = "" },
      mouseleave: function () {
        var menuoption = $("#" + this.id.slice(0, -8))[0]
        menuoption.removeAttribute("data-active");
        setTimeout(() => "active" in menuoption.dataset || menuoption.classList.remove("active"), 200)
      }
    },
    "#menu-options > [id$=-options] > *": {
      click: function (e) {
        var option = this.parentNode.id.slice(0, -8), data = this.dataset[option];
        appPort.send({menu: {[option]: data}});
        $("#" + option + "-options > .selected")[0].classList.remove("selected");
        this.classList.add("selected")
      }
    }
  })
}

function initOutOfRange() {
  $("body")[0].appendChild(document.importNode($("#outofrange")[0].content, true));
}

// Transform object
function T(vw, vh) {
  //let s = Math.sin(Math.PI/3.5), c = Math.cos(Math.PI/3.5);
  //this._t = [.9*s, .9*c, -.9*s, .9*c, vw*11/20, vh/20];
  this._t = [.9, 0, 0, .9, vw/20, vh/20]
}
T.prototype = {
  get: function () { return this._t },
  set: function(val) { return this._t = val },
  reset: function() {this._t = [1, 0, 0, 1, 0, 0]},
  constructor: T
}
var transform;

// Port job queue
function AppPort() {
  this._jobs = [];
  this._ready = false;
  this._port = null
}
AppPort.prototype = {
  send: function (val) { this._ready ? this._port.postMessage(val) : this._jobs.push(val) },
  setPort: function (port) {
    this._port = port;
    this._ready = true;
    while (this._jobs.length) port.postMessage(this._jobs.pop());
    return port
  }
}
var appPort = new AppPort()

// Connect to worker and other tab
var worker = new SharedWorker('shared.js'), messageHandler;
worker.port.onmessage = e => {
  switch (e.data) {
    case "display": initDisplay() ;break;
    case "ui": initUI() ;break;
    case "outofrange": initOutOfRange() ;break;
    default: (appPort.setPort(e.data)).onmessage = e => messageHandler(e)
  }
};
worker.port.postMessage(["load", sessionStorage.mode]);
$.addEvents({ "": {
  unload: e => worker.port.postMessage([e.type]),
  resize: () => 0
} })

// Set mode before DOM has loaded if this is a continued session
switch (sessionStorage.mode) {
  case "display": initDisplay() ;break;
  case "ui": initUI()
}
