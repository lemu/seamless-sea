import { Card, CardContent, Badge } from "@rafal.lemieszewski/tide-ui";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function ConvexStatus() {
  const todos = useQuery(api.todos.getTodos);

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-[var(--color-text-secondary)]">
            Convex Database Status:
          </span>
          {todos === undefined ? (
            <Badge intent="warning" appearance="subtle">
              Connecting...
            </Badge>
          ) : (
            <Badge intent="success" appearance="subtle">
              Connected ✓
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}