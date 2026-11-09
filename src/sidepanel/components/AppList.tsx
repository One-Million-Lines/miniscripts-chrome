import { MiniApp } from "../../shared/types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Play, Settings, Trash2, RotateCcw, MapPin, Package } from "lucide-react";

interface AppListProps {
  apps: MiniApp[];
  onRun: (appId: string) => void;
  onToggle: (appId: string, enabled: boolean) => void;
  onEdit: (app: MiniApp) => void;
  onDelete: (appId: string) => void;
  onLoadSamples?: () => void;
}

export function AppList({ apps, onRun, onToggle, onEdit, onDelete, onLoadSamples }: AppListProps) {
  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-muted-foreground">No scripts yet</p>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Click the + button to create your first script
        </p>
        {onLoadSamples && (
          <Button variant="outline" size="sm" onClick={onLoadSamples}>
            Load sample scripts
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {apps.map((app) => (
        <Card key={app.id} className="transition-shadow hover:shadow-md">
          <CardHeader className="p-3 pb-1.5">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-sm leading-none">{app.name}</h4>
                {app.version && (
                  <p className="text-xs text-muted-foreground">v{app.version}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={app.enabled}
                  onCheckedChange={(checked) => onToggle(app.id, checked)}
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="px-3 pb-3 pt-0 space-y-1.5">
            {app.description && (
              <p className="text-xs text-muted-foreground leading-snug">
                {app.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 hidden">
              {app.autoRun && (
                <Badge variant="secondary" className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Auto-run
                </Badge>
              )}
              {app.matchPatterns.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {app.matchPatterns.length === 1 && app.matchPatterns[0] === "<all_urls>"
                    ? "All URLs"
                    : `${app.matchPatterns.length} pattern${app.matchPatterns.length > 1 ? "s" : ""}`}
                </Badge>
              )}
            </div>

            <div className="flex gap-1.5">
              <Button
                size="xs"
                onClick={() => { 
                  console.log("🔥 AppList: Run button clicked for app:", app.id, "enabled:", app.enabled); 
                  onRun(app.id); 
                }}
                disabled={!app.enabled}
                className="flex-1"
              >
                <Play className="w-3 h-3 mr-1.5" />
                Run now
              </Button>
              <Button 
                variant="outline" 
                size="xs" 
                onClick={() => onEdit(app)}
              >
                <Settings className="w-3 h-3" />
              </Button>
              <Button 
                variant="outline" 
                size="xs" 
                onClick={() => onDelete(app.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
