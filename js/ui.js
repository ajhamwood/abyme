(() => {
// Start closure

sessionStorage.mode = "ui";
sessionStorage.data = sessionStorage.data || "{}";
sessionStorage.uitheme = sessionStorage.uitheme || "day";
$.load("ui");
if (appPort.remote) {
  $("[id^=connection]").forEach(x => x.remove());
  var iv = setInterval(() => appPort.send("getdata"), 1000);
}
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

function resetRemoteUI() {
  $("#matchword-offerer")[0].classList.add("hide");
  $("[data-connection=remote] > input")[0].value = "";
  delete $("[data-connection=remote]")[0].dataset.status;
  $("#connecting-msg")[0].classList.add("hide");
  clearInterval($("#connecting-msg")[0].dataset.iv)
}

messageHandler = e => {
  clearInterval(iv);
  if (e.data == "getdata")
    return appPort.send({transform: JSON.parse(sessionStorage.data || "{}").transform});
  else if (e.data == "switchingremote") {
    resetRemoteUI();
    return $("body")[0].classList.add("modal-active");
  }
  else if (e.data == "switchinglocal") {
    $("[data-connection=local]")[0].dispatchEvent(new Event("click"));
    $("body")[0].classList.remove("modal-active");
    return appPort.send("getdata")
  }
  let message = JSON.parse(e.data)
  if ("theme" in message) {
    sessionStorage.theme = message.theme;
    delete message.theme;
    $("#theme-options > .selected")[0].classList.remove("selected");
    $("#theme-options > [data-theme=" + sessionStorage.theme + "]")[0].classList.add("selected");
  }
  $("svg")[0].classList.remove("hide");
  sessionStorage.data = JSON.stringify(Object.assign(data, message));
  [vw, vh] = data.dimensions;
  transform = new T(vw, vh);
  transform.set(data.transform);
  $("svg")[0].setAttribute("viewBox", [-.5*vw, -.5*vh, 2*vw, 2*vh].join(" "))
  let ext = $("rect")[0];
  ext.setAttribute("width", vw);
  ext.setAttribute("height", vh);
  showTransform()
};

let utils = {}, keyboard = [], mouseup = true, uniform = true;
function resetCtrls() {
  if (uniform) {
    if (keyboard.indexOf("Shift") != -1) {
      utils.theta = Math.atan2(utils.y - utils.midpointy, utils.x - utils.midpointx)
    }
    if (keyboard.indexOf("Control") != -1) {
      utils.abs = Math.sqrt(Math.pow(utils.x - utils.midpointx, 2) + Math.pow(utils.y - utils.midpointy, 2))
    }
  } else {
    if (keyboard.length != 2) {
      let t = transform.get(),
          det = t[0]*t[3] - t[1]*t[2],
          i = [t[3]/det, -t[1]/det, -t[2]/det, t[0]/det, (t[2]*t[5] - t[3]*t[4])/det, (t[1]*t[4] - t[0]*t[5])/det],
          scalex = i[0]*utils.x + i[2]*utils.y + i[4] - utils.premidx,
          scaley = i[1]*utils.x + i[3]*utils.y + i[5] - utils.premidy;
      Object.assign(utils, { i, scalex, scaley })
    } else {
      utils.theta = Math.atan2(utils.y - utils.midpointy, utils.x - utils.midpointx);
      utils.abs = Math.sqrt(Math.pow(utils.x - utils.midpointx, 2) + Math.pow(utils.y - utils.midpointy, 2))
    }
  }
}

if ("ontouchstart" in window) {
  $.addEvents({

  })
} else {
  $.addEvents({
    "": {
      keydown: e => {
        e.stopPropagation();
        let t = transform.get();
        utils.midpointx = t[0]*utils.premidx + t[2]*utils.premidy + t[4];
        utils.midpointy = t[1]*utils.premidx + t[3]*utils.premidy + t[5];
        if (e.key == " ") {
          uniform = !uniform;
          $("#uniformity > .selected")[0].classList.remove("selected");
          $("#uniformity > *")[1-uniform].classList.add("selected");
        } else if (uniform && ["Shift", "Control"].indexOf(e.key) != -1) {
          if (keyboard.indexOf(e.key) == -1) keyboard.push(e.key)
        }
        resetCtrls()
      },
      keyup: e => {
        e.stopPropagation();
        if (["Shift", "Control"].indexOf(e.key) != -1) {
          keyboard.splice(keyboard.indexOf(e.key), 1);
          resetCtrls()
        }
      },
      mousedown: e => {
        let t = transform.get().slice(0),
            viewbox = $("svg")[0].viewBox.baseVal,
            bounds = $("svg")[0].getBoundingClientRect(),
            aspectComp = bounds.height/bounds.width > viewbox.height/viewbox.width,
            scale = [bounds.height/viewbox.height, bounds.width/viewbox.width][+aspectComp],
            premidx = $("rect")[0].width.baseVal.value / 2,
            premidy = $("rect")[0].height.baseVal.value / 2,
            midpointx = t[0]*premidx + t[2]*premidy + t[4],
            midpointy = t[1]*premidx + t[3]*premidy + t[5],
            originx = (1 - aspectComp) * (bounds.width - viewbox.width * scale) / 2 - viewbox.x * scale + bounds.left,
            originy = aspectComp * (bounds.height - viewbox.height * scale) / 2 - viewbox.y * scale + bounds.top,
            x = (e.clientX - originx) / scale,
            y = (e.clientY - originy) / scale;
        utils = Object.assign(utils, { scale, premidx, premidy, midpointx, midpointy, originx, originy, x, y });
        resetCtrls();
        mouseup = false
      },
      mousemove: e => {
        e.preventDefault();
        if (mouseup) return;
        // TODO: Change to: No key = translation, Shift = scale & rotation, Control = shear & aspect?
        // TODO: Separate out into functions
        let x = utils.x, y = utils.y;
        utils.x = (e.clientX - utils.originx) / utils.scale;
        utils.y = (e.clientY - utils.originy) / utils.scale;
        if (uniform) {
          if (keyboard.length == 0) transform.translate(x - utils.x, y - utils.y);
          else {
            if (keyboard.indexOf("Shift") != -1) {
              let theta = utils.theta;
              utils.theta = Math.atan2(utils.y - utils.midpointy, utils.x - utils.midpointx);
              transform.rotate(utils.theta - theta, utils.midpointx, utils.midpointy);
            }
            if (keyboard.indexOf("Control") != -1) {
              let abs = utils.abs;
              utils.abs = Math.sqrt(Math.pow(utils.x - utils.midpointx, 2) +
                Math.pow(utils.y - utils.midpointy, 2));
              transform.scale(utils.abs/abs, utils.midpointx, utils.midpointy);
            }
          }
        } else {
          if (keyboard.length == 2) {
            let theta = utils.theta, abs = utils.abs;
            utils.theta = Math.atan2(utils.y - utils.midpointy, utils.x - utils.midpointx);
            utils.abs = Math.sqrt(Math.pow(utils.x - utils.midpointx, 2) +
              Math.pow(utils.y - utils.midpointy, 2));
            transform.skewRotate(utils.abs/abs, utils.theta - theta, utils.midpointx, utils.midpointy)
          } else {
            let i = utils.i, scalex = utils.scalex, scaley = utils.scaley;
            utils.scalex = i[0]*utils.x + i[2]*utils.y + i[4] - utils.premidx;
            utils.scaley = i[1]*utils.x + i[3]*utils.y + i[5] - utils.premidy;
            if (keyboard.toString() == "Shift") {
              transform.shearX(utils.scalex/scalex, utils.scaley/scaley, utils.midpointx, utils.midpointy)
            } else if (keyboard.toString() == "Control") {
              transform.shearY(utils.scalex/scalex, utils.scaley/scaley, utils.midpointx, utils.midpointy)
            } else if (keyboard.length == 0) {
              transform.scale2d(utils.scalex/scalex, utils.scaley/scaley, utils.midpointx, utils.midpointy)
            }
          }
        }
        let tobj = {transform: transform.get()};
        sessionStorage.data = JSON.stringify(Object.assign(JSON.parse(sessionStorage.data), tobj));
        appPort.send(tobj);
        showTransform()
      },
      mouseup: e => {
        e.stopPropagation();
        mouseup = true;
        uniform = true;
        $("#uniformity > .selected")[0].classList.remove("selected");
        $("#uniformity > :first-child")[0].classList.add("selected")
      },
      "drag dragstart": () => false
    }
  })
}
$.addEvents({
  "": {
    load: () => $(`[data-uitheme=${sessionStorage.uitheme}]`)[0].dispatchEvent(new Event("click")),
    unload: () => { if (appPort.remote) appPort.send("connclosed") }
  },
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
      switch (option) {
        case "connection":
        if (data == "local") {
          resetRemoteUI();
          appPort.remote = false;
        } else if (data == "remote") {
          $("#matchword-offerer")[0].classList.remove("hide");
          $("#matchword-offerer")[0].focus();
          this.dataset.status = "waiting"
        }
        ;break;

        case "theme":
        sessionStorage[option] = data;
        appPort.send({[option]: data})
        ;break;
        case "uitheme":
        sessionStorage[option] = data;
        if (data == "day") $("body")[0].classList.remove("night");
        else if (data == "night") $("body")[0].classList.add("night")
      }
      $("#" + option + "-options > .selected")[0].classList.remove("selected");
      this.classList.add("selected")
    }
  },
  "#matchword-offerer": {
    keypress: function (e) {
      if (e.code == "Enter") {
        appPort.send({matchword: e.target.value});
        $("[data-connection=remote]")[0].dataset.status = "ready";
        $("#matchword-offerer")[0].classList.add("hide");
        $("#connecting-msg")[0].classList.remove("hide");
        $("#msg-matchword")[0].textContent = e.target.value;
        var x = 0, iv = setInterval(() => $("#connecting-msg > :last-child")[0].textContent = ".".repeat(++x % 4), 300);
        $("#connecting-msg")[0].dataset.iv = iv
      }
    },
    blur: function (e) {
      e.target.value = "";
      if ($("[data-connection=remote]")[0].dataset.status == "waiting")
        $("[data-connection=local]")[0].dispatchEvent(new Event("click"))
    }
  }
})

// End closure
})()
