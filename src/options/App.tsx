import { useState, useEffect } from "react";
import { MiniApp } from "../shared/types";
import { sendMessage } from "../shared/messaging";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Download, Upload, Keyboard, FileText, Users, Zap } from "lucide-react";

export function App() {
  const [apps, setApps] = useState<MiniApp[]>([]);

  useEffect(() => {
    loadApps();
  }, []);

  async function loadApps() {
    try {
      const response = await sendMessage({ type: "GET_APPS" });
      setApps(response.payload || []);
    } catch (error) {
      console.error("Failed to load apps:", error);
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
      a.download = `miniapps-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export:", error);
    }
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
          alert("Apps imported successfully!");
        }
      } catch (error) {
        console.error("Failed to import:", error);
        alert("Failed to import apps");
      }
    };
    input.click();
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Mini-Apps Options</h1>
          <p className="text-muted-foreground">Manage your mini-apps and extension settings</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apps.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enabled</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apps.filter((a) => a.enabled).length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-run</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{apps.filter((a) => a.autoRun).length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup & Restore
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Export your apps as JSON or import from a backup file.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button onClick={handleExport} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export All Apps
              </Button>
              <Button variant="outline" onClick={handleImport} className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Apps
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Toggle Sidebar</span>
                <Badge variant="secondary" className="font-mono">Alt+Shift+M</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Re-run Last App</span>
                <Badge variant="secondary" className="font-mono">Alt+Shift+R</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tips & Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                Right-click on any page to access the "Run with Mini-Apps" context menu
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                Apps with auto-run enabled will execute automatically on matching pages
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                Use the sidebar to quickly run apps on demand
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                All settings sync across your Chrome browsers automatically
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
