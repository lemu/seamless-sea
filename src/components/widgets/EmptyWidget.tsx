import { BaseWidget, type WidgetProps } from "./BaseWidget";
import { Icon } from "@rafal.lemieszewski/tide-ui";

interface EmptyConfig {
  title: string;
  showBorder?: boolean;
  showBackground?: boolean;
  debugInfo?: boolean;
}

export function EmptyWidget({ config, onEdit, onDelete, onDuplicate, isEditable }: WidgetProps) {
  return (
    <BaseWidget
      title={config.title}
      onEdit={onEdit}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      isEditable={isEditable}
    >
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Icon name="square-dashed-bottom-code" size="lg" className="mx-auto mb-2 text-[var(--color-text-tertiary)]" />
          <p className="text-body-sm font-medium text-[var(--color-text-primary)]">
            Empty Widget
          </p>
        </div>
      </div>
    </BaseWidget>
  );
}

// Default configuration for new empty widgets
export const defaultEmptyConfig: Omit<EmptyConfig, "type"> = {
  title: "Empty Widget",
  showBorder: true,
  showBackground: true,
  debugInfo: true,
};