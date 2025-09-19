import React from "react";
import { Button, Icon, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@rafal.lemieszewski/tide-ui";

export interface BaseWidgetProps {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isEditable?: boolean;
  loading?: boolean;
  error?: string;
}

export function BaseWidget({ 
  title, 
  children, 
  onEdit, 
  onDelete, 
  onDuplicate,
  isEditable = true,
  loading = false,
  error,
}: BaseWidgetProps) {
  if (error) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)]">
        <div className="border-b border-[var(--color-border-primary-subtle)] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body-medium-md font-medium text-[var(--color-text-primary)] truncate">
              {title}
            </h3>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <Icon 
              name="alert-circle" 
              size="lg" 
              className="mx-auto mb-2 text-[var(--color-text-tertiary)]" 
            />
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Failed to load widget
            </p>
            <p className="text-body-xs text-[var(--color-text-tertiary)] mt-1">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xlg border border-[var(--color-border-primary-bold)] bg-[var(--color-surface-primary)]">
      {/* Widget Header */}
      <div className="border-b border-[var(--color-border-primary-subtle)] px-4 py-3 widget-drag-handle cursor-move">
        <div className="flex items-center justify-between">
          <h3 className="text-body-medium-md font-medium text-[var(--color-text-primary)] truncate">
            {title}
          </h3>
          
          {isEditable && (
            <div className="flex items-center gap-1">
              {/* Widget Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-[var(--color-background-neutral-subtle-hovered)]"
                  >
                    <Icon name="more-horizontal" size="sm" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onEdit && (
                    <DropdownMenuItem
                      icon="edit"
                      onClick={onEdit}
                      className="cursor-pointer"
                    >
                      Edit Widget
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem
                      icon="copy"
                      onClick={onDuplicate}
                      className="cursor-pointer"
                    >
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      icon="trash-2"
                      onClick={onDelete}
                      className="cursor-pointer text-[var(--color-text-destructive)] hover:bg-[var(--color-background-destructive-subtle)]"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-h-0">
        {loading ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-primary-subtle)] border-t-[var(--color-border-brand)]"></div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                Loading...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-auto min-h-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// Widget type definitions for the registry
export type WidgetType = "chart" | "table" | "empty";

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  // Specific config will be defined by each widget type
  [key: string]: any;
}

export interface WidgetProps {
  config: WidgetConfig;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  isEditable?: boolean;
}

// Widget registry for extensibility
export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultConfig: Omit<WidgetConfig, "type">;
  component: React.ComponentType<WidgetProps>;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}