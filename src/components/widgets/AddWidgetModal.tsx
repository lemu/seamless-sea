import React, { useState } from "react";
import { useMutation } from "convex/react";
import {
  Button,
  Icon,
  FormField,
  FormLabel,
  FormControl,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  RadioGroup,
  RadioGroupItem,
} from "@rafal.lemieszewski/tide-ui";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { defaultChartConfig } from "./ChartWidget";
import { defaultTableConfig } from "./TableWidget";
import { defaultEmptyConfig } from "./EmptyWidget";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWidgetCreated?: () => void;
  boardId: Id<"boards">;
}

import type { GenericWidgetConfig, WidgetType } from "../../types/widgets";

interface WidgetTemplate {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  defaultConfig: GenericWidgetConfig;
  preview: React.ReactNode;
}

const widgetTemplates: WidgetTemplate[] = [
  {
    type: "chart",
    name: "Chart Widget",
    description: "Display data in various chart formats like bar, line, pie, and area charts",
    icon: "bar-chart-2",
    defaultConfig: defaultChartConfig,
    preview: (
      <div className="flex items-end justify-center h-16 gap-1">
        {[40, 65, 55, 80, 45, 70].map((height, i) => (
          <div
            key={i}
            className="w-3 bg-blue-500 rounded-t-sm"
            style={{ height: `${(height / 80) * 50}px` }}
          />
        ))}
      </div>
    ),
  },
  {
    type: "table",
    name: "Data Table",
    description: "Display structured data in rows and columns with sorting and filtering",
    icon: "table",
    defaultConfig: defaultTableConfig,
    preview: (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-2 bg-gray-300 rounded flex-1"></div>
          <div className="h-2 bg-gray-300 rounded flex-1"></div>
          <div className="h-2 bg-gray-300 rounded w-12"></div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-2">
            <div className="h-2 bg-gray-100 rounded flex-1"></div>
            <div className="h-2 bg-gray-100 rounded flex-1"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>
    ),
  },
  {
    type: "empty",
    name: "Empty Widget",
    description: "A blank widget for debugging and testing widget container design",
    icon: "square-dashed-bottom-code",
    defaultConfig: defaultEmptyConfig,
    preview: (
      <div className="flex items-center justify-center h-16">
        <div className="space-y-2 text-center">
          <div className="w-8 h-8 mx-auto rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
          <div className="text-xs text-gray-500">Debug</div>
        </div>
      </div>
    ),
  },
];

export function AddWidgetModal({ isOpen, onClose, onWidgetCreated, boardId }: AddWidgetModalProps) {
  const [selectedType, setSelectedType] = useState<string>("");
  const [widgetTitle, setWidgetTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createWidget = useMutation(api.widgets.createWidget);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedType("");
      setWidgetTitle("");
    }
  }, [isOpen]);

  // Update title when template changes
  React.useEffect(() => {
    if (selectedType) {
      const template = widgetTemplates.find(t => t.type === selectedType);
      if (template) {
        setWidgetTitle(template.defaultConfig.title);
      }
    }
  }, [selectedType]);

  const handleCreateWidget = async () => {
    if (!selectedType || !widgetTitle.trim()) return;

    const selectedTemplate = widgetTemplates.find(t => t.type === selectedType);
    if (!selectedTemplate) return;

    setIsCreating(true);
    try {
      await createWidget({
        boardId,
        type: selectedTemplate.type,
        title: widgetTitle.trim(),
        config: {
          ...selectedTemplate.defaultConfig,
          title: widgetTitle.trim(),
        },
      });

      // Notify parent that widget was successfully created
      onWidgetCreated?.();
      // Note: onClose is now called by the parent (onWidgetCreated callback)
    } catch (error) {
      console.error("Failed to create widget:", error);
      alert("Failed to create widget. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add widget</DialogTitle>
        </DialogHeader>
        
        <DialogBody className="space-y-6">
          <div className="space-y-4">
            <FormField>
              <FormLabel>Widget Type</FormLabel>
              <FormControl>
                <RadioGroup value={selectedType} onValueChange={setSelectedType}>
                  {widgetTemplates.map((template) => (
                    <div key={template.type} className="flex items-start space-x-3">
                      <RadioGroupItem value={template.type} id={template.type} className="mt-1" />
                      <div className="flex-1">
                        <label
                          htmlFor={template.type}
                          className="block text-body-medium-md font-medium text-[var(--color-text-primary)] mb-1 cursor-pointer"
                        >
                          {template.name}
                        </label>
                        <p className="text-body-sm text-[var(--color-text-secondary)]">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
            </FormField>

            <FormField>
              <FormLabel htmlFor="widget-title">Widget Title</FormLabel>
              <FormControl>
                <Input
                  id="widget-title"
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="Enter widget title..."
                  disabled={!selectedType}
                />
              </FormControl>
            </FormField>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>

          <Button
            onClick={handleCreateWidget}
            disabled={!selectedType || !widgetTitle.trim() || isCreating}
            className="min-w-24"
          >
            {isCreating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Creating...
              </>
            ) : (
              <>
                <Icon name="plus" size="sm" />
                Create widget
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}