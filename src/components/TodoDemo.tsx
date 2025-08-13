import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Checkbox,
  Badge,
} from "@rafal.lemieszewski/tide-ui";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export function TodoDemo() {
  const [newTodo, setNewTodo] = useState("");
  
  // Live Convex queries and mutations
  const todos = useQuery(api.todos.getTodos) ?? [];
  const createTodo = useMutation(api.todos.createTodo);
  const toggleTodo = useMutation(api.todos.toggleTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const handleAddTodo = async () => {
    if (newTodo.trim()) {
      await createTodo({ text: newTodo.trim() });
      setNewTodo("");
    }
  };

  const handleToggleTodo = async (id: any) => {
    await toggleTodo({ id });
  };

  const handleDeleteTodo = async (id: any) => {
    await deleteTodo({ id });
  };

  const completedCount = todos.filter(todo => todo.completed).length;
  const totalCount = todos.length;

  if (todos === undefined) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-[var(--color-text-secondary)]">
            Loading todos from Convex...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-heading-lg flex items-center justify-between">
          🗄️ Live Convex Database Demo
          <Badge intent="brand" appearance="solid">
            {completedCount}/{totalCount} completed
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Todo Form */}
        <div className="space-y-2">
          <Label htmlFor="new-todo">Add New Todo</Label>
          <div className="flex gap-2">
            <Input
              id="new-todo"
              placeholder="Enter a new todo..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
              className="flex-1"
            />
            <Button onClick={handleAddTodo} variant="primary">
              Add
            </Button>
          </div>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          {todos.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-center py-8">
              No todos yet. Add one above to get started!
            </p>
          ) : (
            todos.map((todo) => (
              <div
                key={todo._id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)]"
              >
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={() => handleToggleTodo(todo._id)}
                />
                <span
                  className={`flex-1 ${
                    todo.completed
                      ? 'line-through text-[var(--color-text-secondary)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {todo.text}
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteTodo(todo._id)}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        {totalCount > 0 && (
          <div className="flex gap-4 pt-4 border-t border-[var(--color-border-primary-subtle)]">
            <Badge intent="neutral" appearance="subtle">
              {totalCount} total
            </Badge>
            <Badge intent="success" appearance="subtle">
              {completedCount} completed
            </Badge>
            <Badge intent="warning" appearance="subtle">
              {totalCount - completedCount} pending
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}