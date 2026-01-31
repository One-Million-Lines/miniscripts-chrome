import { useState } from "react";
import { MiniApp } from "../../shared/types";
import { validateMiniApp } from "../../shared/schema";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AppEditorProps {
  app: MiniApp;
  onSave: (app: MiniApp) => Promise<void>;
  onCancel: () => void;
  isCreating: boolean;
}

export function AppEditor({ app, onSave, onCancel, isCreating }: AppEditorProps) {
  const [formData, setFormData] = useState<MiniApp>(app);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  function updateField<K extends keyof MiniApp>(field: K, value: MiniApp[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function updateMatchPatterns(value: string) {
    const patterns = value.split("\n");
    setFormData((prev) => ({ ...prev, matchPatterns: patterns }));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Prevent form submission on Enter key, allow newlines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.stopPropagation();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validation = validateMiniApp(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setIsSaving(true);

    try {
      const updatedApp = {
        ...formData,
        updatedAt: Date.now(),
      };
      await onSave(updatedApp);
    } catch (error) {
      setErrors([String(error)]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {isCreating ? "Create" : "Edit"} App
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={formData.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version (semver)</Label>
              <Input
                id="version"
                type="text"
                placeholder="1.0.0"
                value={formData.version || ""}
                onChange={(e) => updateField("version", e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => updateField("enabled", checked as boolean)}
              />
              <Label htmlFor="enabled" className="text-sm font-medium">
                Enabled
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoRun"
                checked={formData.autoRun}
                onCheckedChange={(checked) => updateField("autoRun", checked as boolean)}
              />
              <Label htmlFor="autoRun" className="text-sm font-medium">
                Auto-run on matching pages
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matchPatterns">
                Match Patterns * (one per line)
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  e.g., *://*.google.com/*, &lt;all_urls&gt;
                </span>
              </Label>
              <Textarea
                id="matchPatterns"
                className="min-h-[100px] font-mono"
                value={formData.matchPatterns.join("\n")}
                onChange={(e) => updateMatchPatterns(e.target.value)}
                onKeyDown={handleKeyDown}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runAt">Run At</Label>
              <Select
                value={formData.runAt || "document_idle"}
                onValueChange={(value) => updateField("runAt", value as MiniApp["runAt"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document_idle">Document Idle (recommended)</SelectItem>
                  <SelectItem value="document_end">Document End</SelectItem>
                  <SelectItem value="document_start">Document Start</SelectItem>
                  <SelectItem value="click">Click</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                Code * (must export default async function)
              </Label>
              <Textarea
                id="code"
                className="min-h-[300px] font-mono"
                value={formData.code}
                onChange={(e) => updateField("code", e.target.value)}
                onKeyDown={handleKeyDown}
                required
              />
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
