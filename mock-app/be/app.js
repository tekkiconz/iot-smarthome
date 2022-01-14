const express = require("express");
const amqp = require("amqplib/callback_api");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let amqpConn = null;

let deviceStatus = {
  device: "light",
  status: false,
};

let sensorStatus = {
  type: "thermometer",
  temp: 23,
  humid: 40,
};

const start = () => {
  amqp.connect(
    "amqps://bznsuzch:XrXHRS9IYh-xvN6aywUwGRMC_Pb_c461@gerbil.rmq.cloudamqp.com/bznsuzch" +
      "?heartbeat=60",
    (err, conn) => {
      if (err) {
        console.log("[AMQP]: ", err.message);
        return setTimeout(start, 1000);
      }
      conn.on("error", (err) => {
        if (err.message !== "Connection closing") {
          console.error("[AMQP] conn error: ", err.message);
        }
      });
      conn.on("close", function () {
        console.error("[AMQP] reconnecting");
        return setTimeout(start, 1000);
      });

      console.log("[AMQP] connected");
      amqpConn = conn;

      whenConnected();
    }
  );
};

const whenConnected = () => {
  startPublisher();
  startDeviceWorker();
  startSensorWorker();
};

let pubChannel = null;
const offlinePubQueue = [];

const startPublisher = () => {
  amqpConn.createConfirmChannel((err, ch) => {
    if (closeOnErr(err)) return;

    ch.on("error", function (err) {
      console.error("[AMQP] channel error", err.message);
    });

    ch.on("close", function () {
      console.log("[AMQP] channel closed");
    });

    ch.assertExchange("iot", "direct", { durable: true }, (err, _ok) => {
      pubChannel = ch;
      while (true) {
        var m = offlinePubQueue.shift();
        if (!m) break;
        publish(m[0], m[1], m[2]);
      }
    });
  });
};

const publish = (exch, rKey, content) => {
  try {
    pubChannel.publish(exch, rKey, content, { persistent: true }, (err, ok) => {
      if (err) {
        console.error("[AMQP] publish: ", err);
        offlinePubQueue.push([exch, rKey, content]);
        pubChannel.connection.close();
      }
    });
  } catch (e) {
    console.error("[AMQP] publish", e.message);
    offlinePubQueue.push([exch, rKey, content]);
  }
};

const startDeviceWorker = () => {
  amqpConn.createChannel((err, ch) => {
    if (closeOnErr(err)) return;

    ch.on("error", (err) => {
      console.error("[AMQP] channel error", err.message);
    });

    ch.on("close", () => {
      console.log("[AMQP] channel closed");
    });

    ch.assertExchange(
      "iot",
      "direct",
      {
        durable: true,
      },
      (err, _ok) => {
        if (closeOnErr(err)) return;
        ch.assertQueue("esp32/light", { durable: true }, (err, _ok) => {
          if (closeOnErr(err)) return;

          ch.bindQueue("esp32/light", "iot", "esp32/light");
          ch.consume("esp32/light", processMsg, { noAck: false });

          console.log("Worker is started");
        });
      }
    );

    const processMsg = (msg) => {
      work(msg, (ok) => {
        try {
          if (ok) ch.ack(msg);
          else ch.reject(msg, true);
        } catch (e) {
          closeOnErr(e);
        }
      });
    };
  });
};

const startSensorWorker = () => {
  amqpConn.createChannel((err, ch) => {
    if (closeOnErr(err)) return;

    ch.on("error", (err) => {
      console.error("[AMQP] channel error", err.message);
    });

    ch.on("close", () => {
      console.log("[AMQP] channel closed");
    });

    ch.assertExchange(
      "iot",
      "direct",
      {
        durable: true,
      },
      (err, _ok) => {
        if (closeOnErr(err)) return;
        ch.assertQueue("jobs/sensor", { durable: true }, (err, _ok) => {
          if (closeOnErr(err)) return;

          ch.consume("jobs/sensor", processMsg, { noAck: false });

          console.log("Worker is started");
        });
      }
    );

    const processMsg = (msg) => {
      work(msg, (ok) => {
        try {
          if (ok) ch.ack(msg);
          else ch.reject(msg, true);
        } catch (e) {
          closeOnErr(e);
        }
      });
    };
  });
};

const work = (msg, cb) => {
  console.log("Got msg", msg.content.toString());
  cb(true);
};

const closeOnErr = (err) => {
  if (!err) return false;
  console.error("[AMQP] error", err);
  amqpConn.close();
  return true;
};

start();

app.get("/test", (req, res) => {
  publish("iot", "esp32/light", new Buffer(JSON.stringify(deviceStatus)));
  res.send("Hello World!");
});

app.get("/device/status", (req, res) => {
  res.json(deviceStatus);
});

app.post("/device/status", (req, res) => {
  deviceStatus = { ...req.body };
  publish("iot", "jobs/light", new Buffer(JSON.stringify(deviceStatus)));
  res.send(deviceStatus);
});

app.get("/sensor/status", (req, res) => {
  res.json(sensorStatus);
});

app.post("/sensor/status", (req, res) => {
  publish("iot", "jobs/sensor", new Buffer(JSON.stringify(sensorStatus)));
  res.send(sensorStatus);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
