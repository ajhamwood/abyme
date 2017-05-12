// Start closure
(() => {

var data = JSON.parse(sessionStorage.data = sessionStorage.data || "{}");
$.load("display");
$("body")[0].classList.add("modal-active");
messageHandler = e => {
  if (e.data == "getdata") return appPort.send(Object.assign(data, {theme: sessionStorage.theme}));
  else if (e.data == "connclosed") {
    appPort.remote = false;
    return appPort.send("switchinglocal")
  };
  let message = JSON.parse(e.data);
  if ("theme" in message) loop = loops[sessionStorage.theme = message.theme]();
  else if ("matchword" in message) {
    new Remote("ws" + signaluri).makeCall(message.matchword).then(remote => {
      appPort.send("switchingremote");
      (appPort.setPort(remote, true)).onmessage = e => messageHandler(e)
    })
  }
  else if ("transform" in message) sessionStorage.data = JSON.stringify(
    data = Object.assign(data, { transform: transform.set(message.transform) })
  )
};

var canvas = $("#content")[0], context = canvas.getContext("2d"),
    buffer1 = document.createElement("canvas"), bufcon1 = buffer1.getContext("2d"),
    buffer2 = document.createElement("canvas"), bufcon2 = buffer2.getContext("2d"),
    loop, loops, vw, vh;

sessionStorage.mode = "display";
sessionStorage.theme = sessionStorage.theme || "black";
function resizeInner() {
  // TODO: wait until end of resize to redraw?
  var img1 = new Image(canvas.width, canvas.height), d1 = canvas.toDataURL(),
      img2 = new Image(buffer1.width, buffer1.height), d2 = buffer1.toDataURL();
      img3 = new Image(buffer2.width, buffer2.height), d3 = buffer2.toDataURL();
  img1.src = d1;
  img2.src = d2;
  img3.src = d3;
  canvas.width = buffer1.width = buffer2.width = vw = document.body.clientWidth;
  canvas.height = buffer1.height = buffer2.height = vh = document.body.clientHeight;
  let first = !!loop;
  loop = () => {};
  Promise.all([
    new Promise(resolve => img1.onload = () => resolve(context.drawImage(img1, 0, 0))),
    new Promise(resolve => img2.onload = () => resolve(bufcon1.drawImage(img2, 0, 0))),
    new Promise(resolve => img3.onload = () => resolve(bufcon2.drawImage(img3, 0, 0)))
  ]).then(() => first && (loop = loops[sessionStorage.theme]())());

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
function resize (e) { e.stopPropagation(); resizeInner() }
resizeInner();

$.addEvents({
  "": {
    resize,
    unload: () => { if (appPort.remote) appPort.send("connclosed") }
   },
  "#matchword-answerer": {
    keypress: e => {
      if (e.code == "Enter") {
        new Remote("ws" + signaluri).answerCall(e.target.value).then(remote => {
          (appPort.setPort(remote, true)).onmessage = e => messageHandler(e);
          $("#modal, #content, #filters").forEach(x => x.remove());
          $("body")[0].classList.remove("modal-active");
          loop = () => {};
          window.removeEventListener("resize", resize);
          $.load("ui-js");
          worker.port.postMessage(["unload"]);
          worker.port.postMessage(["load", "ui"]);
        })
      }
    }
  }
});

(loop = (loops = {
  white: () => {
    context.fillStyle = "#fff";
    return () => {
      context.fillRect(0, 0, vw, vh);
      context.setTransform.apply(context, transform.get());
      context.globalCompositeOperation = "difference";
      context.drawImage(buffer1, 0, 0, vw, vh);
      bufcon1.drawImage(canvas, 0, 0, vw, vh);
      context.resetTransform();
      context.globalCompositeOperation = "source-over";
      window.requestAnimationFrame(loop)
    }
  },
  black: () => {
    context.fillStyle = "#fff";
    return () => {
      context.fillRect(0, 0, vw, vh);
      context.setTransform.apply(context, transform.get());
      context.globalCompositeOperation = "difference";
      context.drawImage(buffer1, 0, 0, vw, vh);
      bufcon1.drawImage(canvas, 0, 0, vw, vh);
      context.resetTransform();
      context.fillRect(0, 0, vw, vh);
      context.globalCompositeOperation = "source-over";
      window.requestAnimationFrame(loop)
    }
  },
  glow: () => {
    context.fillStyle = "#000";
    return () => {
      context.fillRect(0, 0, vw, vh);
      context.setTransform.apply(context, transform.get());
      context.filter = "url(#glow)";
      context.drawImage(buffer1, 0, 0, vw, vh);
      context.filter = "none";
      bufcon1.drawImage(canvas, 0, 0, vw, vh);
      context.resetTransform();
      window.requestAnimationFrame(loop)
    }
  },
  mirrorwhite: () => {
    bufcon2.setTransform(-1, 0, 0, 1, 0, 0);
    context.fillStyle = "#fff";
    return () => {
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
    }
  },
  mirrorblack: () => {
    bufcon2.setTransform(-1, 0, 0, 1, 0, 0);
    context.fillStyle = "#fff";
    return () => {
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
    }
  },
  mirrorglow: () => {
    bufcon2.setTransform(-1, 0, 0, 1, 0, 0);
    context.fillStyle = "#000";
    return () => {
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
    }
  }
})[sessionStorage.theme]())()

// End closure
})()
