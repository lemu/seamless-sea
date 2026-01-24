import { toast, Button } from "@rafal.lemieszewski/tide-ui";
import type { ExportCallbacks } from "../types/export";

export function useExportNotifications() {
  const createExportCallbacks = (
    format: string,
    retryFn: () => void
  ): ExportCallbacks => {
    let toastId: string | number;

    return {
      onStart: () => {
        toastId = toast.loading("Preparing export", {
          description: (
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              Processing your data...
            </p>
          ),
        });
      },

      onProgress: (stage) => {
        if (stage === 'ready') {
          toast.success("Download starting", {
            id: toastId,
            description: (
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                {format.toUpperCase()} file ready
              </p>
            ),
            duration: 1500,
          });
        }
      },

      onComplete: ({ recordCount }) => {
        toast.success("Export completed!", {
          description: (
            <div className="flex flex-col gap-[var(--space-md)]">
              <p className="text-body-md text-[var(--color-text-primary)]">
                {recordCount.toLocaleString()} records exported as {format.toUpperCase()}
              </p>
              <div className="flex gap-[var(--space-sm)]">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    toast.dismiss();
                    retryFn();
                  }}
                >
                  Download didn't start?
                </Button>
              </div>
            </div>
          ),
          duration: 5000,
        });
      },

      onError: (error) => {
        toast.error("Export failed", {
          id: toastId,
          description: (
            <div className="flex flex-col gap-[var(--space-md)]">
              <p className="text-body-sm text-[var(--color-text-primary)]">
                {error.message}
              </p>
              <div className="flex gap-[var(--space-sm)]">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    toast.dismiss();
                    retryFn();
                  }}
                >
                  Retry
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => toast.dismiss()}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ),
        });
      },
    };
  };

  return { createExportCallbacks };
}
