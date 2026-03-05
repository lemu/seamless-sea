import React from "react";
import { Copy, SquareX, Pencil, Check } from "lucide-react";
import {
  Button,
  Icon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rafal.lemieszewski/tide-ui";
import { getSizeFromRowsForConfigs, WIDGET_SIZE_CONFIGS, type WidgetSize, type WidgetSizeConfig } from "../../types/widgets";

export interface BaseWidgetProps {
  title: string;
  children: React.ReactNode;
  rows?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onResize?: (size: WidgetSize) => void;
  isEditable?: boolean;
  loading?: boolean;
  error?: string;
  sizeConfigs?: Partial<Record<WidgetSize, WidgetSizeConfig>>;
}

export function BaseWidget({
  title,
  children,
  rows,
  onEdit,
  onDelete,
  onDuplicate,
  onResize,
  isEditable = true,
  loading = false,
  error,
  sizeConfigs,
}: BaseWidgetProps) {
  const effectiveSizeConfigs = sizeConfigs ?? WIDGET_SIZE_CONFIGS;
  if (error) {
    return (
      <div className="flex h-full flex-col rounded-l border border-[var(--color-border-primary-subtle)] bg-[var(--color-surface-primary)]">
        <div className="border-b border-[var(--color-border-primary-subtle)] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3
              className="truncate text-[var(--color-text-primary)]"
              style={{ fontSize: 16, fontWeight: 600, lineHeight: "1.4" }}
            >
              {title}
            </h3>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <Icon
              name="alert-circle"
              size="l"
              className="mx-auto mb-2 text-[var(--color-text-tertiary)]"
            />
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Failed to load widget
            </p>
            <p className="text-body-xs mt-1 text-[var(--color-text-tertiary)]">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl flex h-full flex-col border border-[var(--color-border-primary-medium)] bg-[var(--color-surface-primary)] overflow-hidden">
      {/* Widget Header */}
      <div className="widget-drag-handle cursor-grab border-b border-[var(--color-border-primary-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <h3
            className="truncate text-[var(--color-text-primary)]"
            style={{ fontSize: 16, fontWeight: 600, lineHeight: "1.4" }}
          >
            {title}
          </h3>

          {isEditable && (
            <div className="flex items-center gap-1">
              {/* Widget Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="s" icon="more-horizontal" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onResize && (
                    <>
                      {(Object.entries(effectiveSizeConfigs) as [WidgetSize, WidgetSizeConfig][]).map(([size, cfg]) => {
                        const isCurrent = getSizeFromRowsForConfigs(rows ?? 1, effectiveSizeConfigs) === size;
                        return (
                          <DropdownMenuItem
                            key={size}
                            icon={isCurrent ? Check : undefined}
                            onClick={() => onResize(size)}
                          >
                            {cfg.label}
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {onEdit && (
                    <DropdownMenuItem icon={Pencil} onClick={onEdit}>
                      Edit widget
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem icon={Copy} onClick={onDuplicate}>
                      Duplicate widget
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      icon={SquareX}
                      onClick={onDelete}
                      destructive
                    >
                      Remove widget
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export types from centralized types file
export type { WidgetType, GenericWidgetConfig as WidgetConfig, WidgetDefinition } from "../../types/widgets";
import type { GenericWidgetConfig } from "../../types/widgets";

export interface WidgetProps {
  config: GenericWidgetConfig & { type: string };
  rows?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onResize?: (size: WidgetSize) => void;
  isEditable?: boolean;
  sizeConfigs?: Partial<Record<WidgetSize, WidgetSizeConfig>>;
}
