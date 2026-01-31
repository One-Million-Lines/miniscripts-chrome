import { useState, useEffect } from "react";
import { ExecutionLog } from "../../shared/types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Trash2, ChevronDown, ChevronRight, X } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";

interface ExecutionHistoryProps {
  onClose?: () => void;
}

export function ExecutionHistory({ onClose }: ExecutionHistoryProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_EXECUTION_LOGS",
      });
      setLogs(response.payload || []);
    } catch (error) {
      console.error("Failed to load execution logs:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function clearAllLogs() {
    if (!confirm("Are you sure you want to clear all execution logs?")) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "CLEAR_EXECUTION_LOGS",
      });
      setLogs([]);
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  }

  async function deleteLog(logId: string) {
    try {
      await chrome.runtime.sendMessage({
        type: "DELETE_EXECUTION_LOG",
        payload: logId,
      });
      setLogs((prev) => prev.filter((log) => log.id !== logId));
    } catch (error) {
      console.error("Failed to delete log:", error);
    }
  }

  function toggleExpanded(logId: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }

  function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  function formatDuration(duration: number) {
    if (duration < 1000) {
      return `${duration}ms`;
    }
    return `${(duration / 1000).toFixed(2)}s`;
  }

  function formatValue(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading execution history...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Execution History</CardTitle>
            <div className="flex gap-2">
              {logs.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllLogs}>
                  Clear All
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <Alert>
              <AlertDescription>
                No execution history yet. Run an app to see its execution logs here.
              </AlertDescription>
            </Alert>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              return (
                <Card key={log.id} className="border">
                  <CardHeader className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => toggleExpanded(log.id)}
                            className="p-0 hover:bg-accent rounded"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <h3 className="font-semibold text-sm truncate">{log.appName}</h3>
                          <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                            {log.success ? "✓" : "✗"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                          <span>{formatTimestamp(log.timestamp)}</span>
                          <span>{formatDuration(log.duration)}</span>
                          {log.consoleLogs.length > 0 && (
                            <span>{log.consoleLogs.length} log{log.consoleLogs.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLog(log.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="p-3 pt-0 space-y-2">
                      {log.error && (
                        <div className="bg-destructive/10 text-destructive p-2 rounded text-xs font-mono">
                          <strong>Error:</strong> {log.error}
                        </div>
                      )}

                      {log.returnValue !== undefined && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Return Value:</div>
                          <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                            {formatValue(log.returnValue)}
                          </pre>
                        </div>
                      )}

                      {log.consoleLogs.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium">Console Logs:</div>
                          <div className="space-y-1 max-h-60 overflow-y-auto">
                            {log.consoleLogs.map((consoleLog, idx) => {
                              const typeColors = {
                                log: "bg-muted",
                                info: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
                                warn: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
                                error: "bg-red-500/10 text-red-700 dark:text-red-300",
                              };
                              return (
                                <div
                                  key={idx}
                                  className={`p-2 rounded text-xs font-mono ${typeColors[consoleLog.type]}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="font-semibold uppercase opacity-60">
                                      {consoleLog.type}:
                                    </span>
                                    <span className="flex-1">
                                      {consoleLog.args.map((arg, i) => formatValue(arg)).join(" ")}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
