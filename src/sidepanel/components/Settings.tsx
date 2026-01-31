import { Button } from "../../components/ui/button";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Download, Upload, X } from "lucide-react";
import { set } from "date-fns";

interface SettingsProps {
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onSaveConfig?: (config: string) => void;
}

export function SettingsSection({ onClose, onExport, onImport, onSaveConfig }: SettingsProps) {
  const [configValue, setConfigValue] = React.useState<string | null>(null);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Settings</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6 overflow-y-auto">
          {/* Import/Export Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Backup & Restore</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Export your apps as JSON or import from a backup file.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={onExport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export All Apps
              </Button>
              <Button variant="outline" onClick={onImport} className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Import Apps
              </Button>
            </div>
          </div>

          <Separator />

          {/* Configuration Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Additional settings and configuration options.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="config-text">Additional Configuration</Label>
              <Textarea
                id="config-text"
                placeholder="Add your configuration notes here... (This will be updated later)"
                value={configValue}
                onChange={(e) => setConfigValue(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This section will be populated with additional settings in future updates.
              </p>
            </div>
          </div>

          <Separator />

          {/* Info Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">About</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>ProductivityApps Extension allows you to create and run custom JavaScript snippets on web pages.</p>
              <p>Free, open-source, built for <a href="https://actordo.com/" className="underline" target="_blank">ActorDo</a></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}