import "./App.css";
import axios from "axios";
import { useState } from "react";
import CachedIcon from "@mui/icons-material/Cached";
import { IconButton, Switch } from "@mui/material";

function App() {
  const [deviceStatus, setDeviceStatus] = useState({
    device: "light",
    status: true,
  });

  const [sensorStatus, setSensorStatus] = useState({
    type: "thermometer",
    temp: 40,
    humid: 40,
  });

  const getStatus = async () => {
    const newDeviceStatus = await axios.get(
      "http://localhost:3000/device/status"
    );
    setDeviceStatus({ ...newDeviceStatus.data });

    const newSensorStatus = await axios.get(
      "http://localhost:3000/sensor/status"
    );
    setSensorStatus({ ...newSensorStatus.data });

    console.log(deviceStatus, sensorStatus);
  };

  const postDeviceStatus = async () => {
    const res = await axios.post("http://localhost:3000/device/status", {
      device: "light",
      status: !deviceStatus.status,
    });

    setDeviceStatus({ ...res.data });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100vh",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <h3
          style={{
            paddingLeft: "2rem",
            marginTop: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          Mock app
        </h3>
      </header>
      <div
        style={{
          flexGrow: "1",
          display: "grid",
          gridGap: "1rem",
          gridTemplateColumns: "1fr 2fr",
          gridTemplateRows: "auto",
          padding: "1rem",
          height: "80%",
        }}
      >
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <div>
            <IconButton onClick={getStatus}>
              <CachedIcon />
            </IconButton>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
            }}
          >
            <div
              style={{
                flexGrow: 1,
              }}
            >
              light 1
            </div>
            <Switch checked={deviceStatus.status} onChange={postDeviceStatus} />
          </div>
        </div>
        <div
          style={{
            border: "1px solid #e0e0e0",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          Log n stuff
        </div>
      </div>
    </div>
  );
}

export default App;
