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
} from "@rafal.lemieszewski/tide-ui";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { defaultChartConfig } from "./ChartWidget";
import { defaultTableConfig } from "./TableWidget";
import { defaultEmptyConfig } from "./EmptyWidget";

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"boards">;
}

interface WidgetTemplate {
  type: "chart" | "table" | "empty";
  name: string;
  description: string;
  icon: string;
  defaultConfig: any;
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

export function AddWidgetModal({ isOpen, onClose, boardId }: AddWidgetModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WidgetTemplate | null>(null);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createWidget = useMutation(api.widgets.createWidget);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(null);
      setWidgetTitle("");
    }
  }, [isOpen]);

  // Update title when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      setWidgetTitle(selectedTemplate.defaultConfig.title);
    }
  }, [selectedTemplate]);

  const handleCreateWidget = async () => {
    if (!selectedTemplate || !widgetTitle.trim()) return;

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

      onClose();
    } catch (error) {
      console.error("Failed to create widget:", error);
      alert("Failed to create widget. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleTemplateSelect = (template: WidgetTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
        </DialogHeader>
        
        <DialogBody className="space-y-6 max-h-[60vh] overflow-auto">
          {!selectedTemplate ? (
            // Template Selection Step
            <>
              <div>
                <h3 className="text-body-medium-md font-medium text-[var(--color-text-primary)] mb-2">
                  Choose a widget type
                </h3>
                <p className="text-body-sm text-[var(--color-text-secondary)] mb-4">
                  Select the type of widget you want to add to your dashboard
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {widgetTemplates.map((template) => (
                  <button
                    key={template.type}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border border-[var(--color-border-primary-subtle)] rounded-lg hover:border-[var(--color-border-brand)] hover:bg-[var(--color-background-neutral-subtle)] text-left transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-background-brand-subtle)] rounded-lg flex items-center justify-center group-hover:bg-[var(--color-background-brand)]">
                        <Icon 
                          name={template.icon as any} 
                          size="md" 
                          className="text-[var(--color-text-brand)] group-hover:text-white" 
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-body-medium-md font-medium text-[var(--color-text-primary)] mb-1">
                          {template.name}
                        </h4>
                        <p className="text-body-sm text-[var(--color-text-secondary)] mb-3">
                          {template.description}
                        </p>
                        
                        {/* Widget Preview */}
                        <div className="w-full h-16 bg-[var(--color-background-neutral-subtle)] rounded border p-2">
                          {template.preview}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            // Configuration Step
            <>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                  className="flex-shrink-0"
                >
                  <Icon name="arrow-left" size="sm" />
                  Back
                </Button>
                
                <div>
                  <h3 className="text-body-medium-md font-medium text-[var(--color-text-primary)]">
                    Configure {selectedTemplate.name}
                  </h3>
                  <p className="text-body-sm text-[var(--color-text-secondary)]">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>

              {/* Widget Configuration Form */}
              <div className="space-y-4">
                <FormField>
                  <FormLabel htmlFor="widget-title">Widget Title</FormLabel>
                  <FormControl>
                    <Input
                      id="widget-title"
                      type="text"
                      value={widgetTitle}
                      onChange={(e) => setWidgetTitle(e.target.value)}
                      placeholder="Enter widget title..."
                      autoFocus
                    />
                  </FormControl>
                </FormField>

                {/* Widget Type Specific Configuration */}
                {selectedTemplate.type === "chart" && (
                  <FormField>
                    <FormLabel>Chart Type</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2">
                        {["bar", "line", "pie", "area"].map((chartType) => (
                          <button
                            key={chartType}
                            className="p-2 border border-[var(--color-border-primary-subtle)] rounded text-center hover:border-[var(--color-border-brand)] capitalize text-body-sm"
                          >
                            {chartType}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                  </FormField>
                )}

                {/* Preview */}
                <FormField>
                  <FormLabel>Preview</FormLabel>
                  <FormControl>
                    <div className="w-full h-32 bg-[var(--color-background-neutral-subtle)] rounded-lg border p-4 flex items-center justify-center">
                      {selectedTemplate.preview}
                    </div>
                  </FormControl>
                </FormField>
              </div>
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          
          {selectedTemplate && (
            <Button 
              onClick={handleCreateWidget}
              disabled={!widgetTitle.trim() || isCreating}
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
                  Create Widget
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}