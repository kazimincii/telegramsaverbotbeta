import React from "react";
import ControlPanel from "./components/ControlPanel";
import ThemeToggle from "./components/ThemeToggle";
import CLIPSearchPanel from "./components/CLIPSearchPanel";
import { AppProvider } from "./context/AppContext";

export default function App(){
  return (
    <AppProvider>
      <ThemeToggle />
      <ControlPanel />
      <CLIPSearchPanel />
    </AppProvider>
  );
}
