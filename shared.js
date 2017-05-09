var clients = {};

function newChannel() {
  let mc = new MessageChannel();
  clients.display.postMessage(mc.port1, [mc.port1]);
  clients.ui.postMessage(mc.port2, [mc.port2])
}

onconnect = ec => {
  var port = ec.ports[0], index;
  port.onmessage = em => {
    if (em.data[0] == "load") {
      if (em.data[1] == "display") {
        clients.display = port;
        if (clients.ui) newChannel()
      } else if (em.data[1] == "ui") {
        clients.ui = port;
        if (clients.display) newChannel()
      } else if (!clients.display) {
        clients.display = port;
        port.postMessage("display");
        if (clients.ui) newChannel()
      } else if (!clients.ui) {
        clients.ui = port;
        port.postMessage("ui");
        if (clients.display) newChannel()
      } else port.postMessage("outofrange")
    } else if (em.data[0] == "unload") {
      ["display", "ui"].find(mode => { if (clients[mode] == port) return delete clients[mode] })
    }
  }
}
