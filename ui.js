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

let mouse, keyboard = [];
$.addEvents({
  "": {
    load: () => $(`[data-uitheme=${sessionStorage.uitheme}]`)[0].dispatchEvent(new Event("click")),
    keydown: e => {
      e.stopPropagation();
      if (e.key == "Shift" || e.key == "Control") if (keyboard.indexOf(e.key) == -1) keyboard.push(e.key);
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
    mouseup: e => mouse = null,
    unload: () => { if (appPort.remote) appPort.send("connclosed") }
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
