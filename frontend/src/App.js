import React from "react";
import ControlPanel from "./components/ControlPanel";
import { AppProvider } from "./context/AppContext";

export default function App(){
  return (
    <AppProvider>
      <ControlPanel />
    </AppProvider>
  );
}
