import { Button } from "../../components/ui/button";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import { Download, Upload, X, RefreshCw } from "lucide-react";

interface SettingsProps {
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onReloadSamples: () => void;
  onSaveConfig?: (config: Record<string, unknown>) => void;
}

export function SettingsSection({ onClose, onExport, onImport, onReloadSamples }: SettingsProps) {
  const [confirming, setConfirming] = React.useState(false);

  function handleReload() {
    if (!confirming) { setConfirming(true); return; }
    onReloadSamples();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Settings</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6 overflow-y-auto">
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Script Access</h3>
            <p className="text-sm text-muted-foreground">Enable Allow User Scripts in MiniScripts extension details, then reload the extension and website. Chrome 135–137 uses Developer mode instead.</p>
            <Button variant="outline" onClick={() => chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })}>Open extension details</Button>
          </div>
          <Separator />
          {/* Backup / Restore */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Backup &amp; Restore</h3>
            <p className="text-sm text-muted-foreground">
              Export your scripts as JSON or import from a backup file.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />Export All
              </Button>
              <Button variant="outline" onClick={onImport} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />Import
              </Button>
            </div>
          </div>

          <Separator />

          {/* Reload Samples */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium">Sample Scripts</h3>
            <p className="text-sm text-muted-foreground">
              Update the built-in samples (Blur Overlay, Reader
              Margins, Copy All Links, LinkedIn Image Paste). Other scripts are kept. Changes you made to built-in samples will be replaced.
            </p>
            <Button
              variant={confirming ? "destructive" : "outline"}
              onClick={handleReload}
              onBlur={() => setConfirming(false)}
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {confirming ? "Click again to update built-in samples" : "Reload sample scripts"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-medium">About</h3>
            <p className="text-sm text-muted-foreground">
              MiniScripts — run custom JavaScript on any web page. Open source.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}