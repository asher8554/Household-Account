// React 앱을 브라우저 루트에 연결하는 진입점입니다.
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
