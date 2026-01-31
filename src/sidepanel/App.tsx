/// <reference types="chrome" />
import { useState, useEffect } from "react";
import { MiniApp } from "../shared/types";
import { AppList } from "./components/AppList";
import { AppEditor } from "./components/AppEditor";
import { SettingsSection } from "./components/Settings";
import { ExecutionHistory } from "./components/ExecutionHistory";
import { sendMessage } from "../shared/messaging";
import { generateUUID } from "../shared/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Plus, Settings as SettingsIcon, History } from "lucide-react";

export function App() {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<MiniApp[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled" | "autorun">("all");
  const [editingApp, setEditingApp] = useState<MiniApp | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    function filterApps() {
      let filtered = apps;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (app) =>
            app.name.toLowerCase().includes(query) ||
            app.description?.toLowerCase().includes(query)
        );
      }

      if (filter === "enabled") {
        filtered = filtered.filter((app) => app.enabled);
      } else if (filter === "disabled") {
        filtered = filtered.filter((app) => !app.enabled);
      } else if (filter === "autorun") {
        filtered = filtered.filter((app) => app.autoRun);
      }

      setFilteredApps(filtered);
    }
    
    filterApps();
  }, [apps, searchQuery, filter]);

  async function loadApps() {
    try {
      console.log("📥 Loading apps...");
      const response = await sendMessage({ type: "GET_APPS" });
      console.log("📦 Apps loaded:", response.payload?.length || 0, response.payload);
      setApps(response.payload || []);
    } catch (error) {
      console.error("❌ Failed to load apps:", error);
    }
  }

  async function handleRunApp(appId: string) {
    console.log("🚀 handleRunApp called with appId:", appId);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log("📋 Current tab:", tab);
      if (!tab?.id) {
        console.warn("❌ No active tab found");
        return;
      }

      console.log("📨 Sending RUN_APP message...");
      await sendMessage({
        type: "RUN_APP",
        payload: { appId, tabId: tab.id },
      });
      console.log("✅ RUN_APP message sent successfully");
    } catch (error) {
      console.error("❌ Failed to run app:", error);
    }
  }

  async function handleToggleApp(appId: string, enabled: boolean) {
    try {
      await sendMessage({
        type: "TOGGLE_APP",
        payload: { appId, enabled },
      });
      await loadApps();
    } catch (error) {
      console.error("Failed to toggle app:", error);
    }
  }

  async function handleSaveApp(app: MiniApp) {
    try {
      await sendMessage({
        type: "SAVE_APP",
        payload: app,
      });
      await loadApps();
      setEditingApp(null);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to save app:", error);
      throw error;
    }
  }

  async function handleDeleteApp(appId: string) {
    if (!confirm("Are you sure you want to delete this app?")) return;

    try {
      await sendMessage({
        type: "DELETE_APP",
        payload: appId,
      });
      await loadApps();
    } catch (error) {
      console.error("Failed to delete app:", error);
    }
  }

  async function handleExport() {
    try {
      const response = await sendMessage({ type: "EXPORT_APPS" });
      const json = JSON.stringify(response.payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miniapps-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export apps:", error);
    }
  }
  async function handleConfigSave(config: Record<string, any>) {
    // Placeholder for saving configuration settings
    console.log("Configuration saved:", config);
  }
  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (!Array.isArray(imported)) {
          alert("Invalid file format");
          return;
        }

        if (confirm(`Import ${imported.length} apps? This will replace all existing apps.`)) {
          await sendMessage({
            type: "IMPORT_APPS",
            payload: imported,
          });
          await loadApps();
        }
      } catch (error) {
        console.error("Failed to import apps:", error);
        alert("Failed to import apps");
      }
    };
    input.click();
  }

  function handleCreateNew() {
    const newApp: MiniApp = {
      id: generateUUID(),
      name: "New App",
      description: "",
      enabled: true,
      autoRun: false,
      matchPatterns: ["<all_urls>"],
      runAt: "document_idle",
      code: 'export default async function run(ctx) {\n  ctx.ui.notify("Hello from new app!");\n}',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditingApp(newApp);
    setIsCreating(true);
  }

  if (editingApp) {
    return (
      <AppEditor
        app={editingApp}
        onSave={handleSaveApp}
        onCancel={() => {
          setEditingApp(null);
          setIsCreating(false);
        }}
        isCreating={isCreating}
      />
    );
  }

  if (showHistory) {
    return <ExecutionHistory onClose={() => setShowHistory(false)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <Card className="border-b rounded-none">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Productivity Apps</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(true)}
                className="h-8 w-8 p-0"
                title="Execution History"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="h-8 w-8 p-0"
                title="Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={filter === "all" ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilter("all")}
              >
                All
              </Badge>
              <Badge
                variant={filter === "enabled" ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilter("enabled")}
              >
                Enabled
              </Badge>
              <Badge
                variant={filter === "disabled" ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilter("disabled")}
              >
                Disabled
              </Badge>
              <Badge
                variant={filter === "autorun" ? "default" : "secondary"}
                className="cursor-pointer"
                onClick={() => setFilter("autorun")}
              >
                Auto-run
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 overflow-y-auto p-4">
        <AppList
          apps={filteredApps}
          onRun={handleRunApp}
          onToggle={handleToggleApp}
          onEdit={setEditingApp}
          onDelete={handleDeleteApp}
        />
      </div>

      <Button 
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleCreateNew} 
        title="Add new app"
      >
        <Plus className="w-6 h-6" />
      </Button>
      {showSettings && (
        <SettingsSection
          onClose={() => setShowSettings(false)}
          onExport={handleExport}
          onImport={handleImport}
          onSaveConfig={handleConfigSave}
        />
      )}
    </div>
  );
}
