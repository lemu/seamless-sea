import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  RadioGroup,
  RadioGroupItem,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  toast,
} from "@rafal.lemieszewski/tide-ui";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useUser } from "../hooks";
import type { WidgetSource } from "../types/widgets";
import type { ChartRegistryEntry } from "../data/chartRegistry";
import { getChartById } from "../data/chartRegistry";

interface AddToBoardModalProps {
  chartTitle: string;
  source: WidgetSource;
  onClose: () => void;
}

type Mode = "existing" | "new";

export function AddToBoardModal({ chartTitle, source, onClose }: AddToBoardModalProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("existing");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?._id ? { userId: user._id } : "skip"
  );
  const currentOrg = userOrganizations?.[0];

  const boards = useQuery(
    api.boards.getBoardsByUserAndOrg,
    user?._id && currentOrg?._id
      ? { userId: user._id, organizationId: currentOrg._id }
      : "skip"
  );

  const createBoard = useMutation(api.boards.createBoard);
  const createWidget = useMutation(api.widgets.createWidget);

  const chartEntry: ChartRegistryEntry | undefined = getChartById(source.chartId);

  const buildWidgetConfig = (boardId: Id<"boards">) => ({
    title: chartTitle,
    chartType: chartEntry?.defaultChartType ?? "composed",
    source,
    boardId,
  });

  const handleSubmit = async () => {
    if (!user?._id || !currentOrg?._id) return;
    if (mode === "existing" && !selectedBoardId) return;
    if (mode === "new" && !newBoardTitle.trim()) return;

    setIsSaving(true);
    try {
      let targetBoardId: Id<"boards">;
      let boardTitle: string;

      if (mode === "new") {
        boardTitle = newBoardTitle.trim();
        targetBoardId = await createBoard({
          title: boardTitle,
          userId: user._id,
          organizationId: currentOrg._id,
        });
      } else {
        targetBoardId = selectedBoardId as Id<"boards">;
        boardTitle = boards?.find((b) => b._id === selectedBoardId)?.title ?? "Board";
      }

      await createWidget({
        boardId: targetBoardId,
        type: "chart",
        title: chartTitle,
        config: buildWidgetConfig(targetBoardId),
      });

      onClose();

      if (mode === "new") {
        // Navigate directly to the new board
        navigate(`/boards/${targetBoardId}`);
      } else {
        toast.success(`Added to "${boardTitle}"`, {
          action: {
            label: "View Board",
            onClick: () => navigate(`/boards/${targetBoardId}`),
          },
        });
      }
    } catch (error) {
      console.error("Failed to add to board:", error);
      toast.error("Failed to add chart to board");
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit =
    !isSaving &&
    (mode === "existing" ? !!selectedBoardId : newBoardTitle.trim().length > 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Board</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Adding <strong className="text-[var(--color-text-primary)]">"{chartTitle}"</strong> as a live widget.
          </p>

          {/* Mode toggle */}
          <RadioGroup
            value={mode}
            onValueChange={(val) => setMode(val as Mode)}
            className="flex gap-3"
          >
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="existing" />
              <span className="text-body-sm text-[var(--color-text-primary)]">Existing board</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value="new" />
              <span className="text-body-sm text-[var(--color-text-primary)]">New board</span>
            </label>
          </RadioGroup>

          {mode === "existing" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm text-[var(--color-text-primary)]">Select a board</label>
              {boards === undefined ? (
                <div className="h-9 rounded-md bg-[var(--color-bg-secondary)] animate-pulse" />
              ) : boards.length === 0 ? (
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  No boards yet — switch to "New board" to create one.
                </p>
              ) : (
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a board…" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board._id} value={board._id}>
                        {board.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-body-sm text-[var(--color-text-primary)]">Board title</label>
              <Input
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="My new board…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit();
                }}
              />
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSaving
              ? "Adding…"
              : mode === "new"
              ? "Create & Add"
              : "Add to Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
