import React from "react";
import ControlPanel from "./components/ControlPanel";
import ThemeToggle from "./components/ThemeToggle";
import CLIPSearchPanel from "./components/CLIPSearchPanel";
import WebhookManager from "./components/WebhookManager";
import CloudSyncSettings from "./components/CloudSyncSettings";
import VideoProcessor from "./components/VideoProcessor";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { AppProvider } from "./context/AppContext";

export default function App(){
  return (
    <AppProvider>
      <ThemeToggle />
      <ControlPanel />
      <AnalyticsDashboard />
      <CLIPSearchPanel />
      <WebhookManager />
      <CloudSyncSettings />
      <VideoProcessor />
    </AppProvider>
  );
}
