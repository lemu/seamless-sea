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
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useUser } from "../../hooks";

interface PinNewsToBoardModalProps {
  filters: {
    region: string;
    category: string;
    vesselType: string;
    impactLevel: string;
  };
  onClose: () => void;
}

type Mode = "existing" | "new";

export function PinNewsToBoardModal({ filters, onClose }: PinNewsToBoardModalProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const [mode, setMode] = useState<Mode>("existing");
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [widgetTitle, setWidgetTitle] = useState("News Feed");
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

  const activeFilterParts: string[] = [];
  if (filters.region) activeFilterParts.push(`Region: ${filters.region}`);
  if (filters.category) activeFilterParts.push(`Category: ${filters.category}`);
  if (filters.vesselType) activeFilterParts.push(`Vessel: ${filters.vesselType}`);
  if (filters.impactLevel) {
    const label = filters.impactLevel.charAt(0).toUpperCase() + filters.impactLevel.slice(1);
    activeFilterParts.push(`Impact: ${label}`);
  }

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
        type: "news_ticker",
        title: widgetTitle,
        config: {
          title: widgetTitle,
          filters: {
            region: filters.region || undefined,
            category: filters.category || undefined,
            vesselType: filters.vesselType || undefined,
            impactLevel: (filters.impactLevel as "high" | "medium" | "low") || undefined,
          },
        },
      });

      onClose();

      if (mode === "new") {
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
      console.error("Failed to pin news feed to board:", error);
      toast.error("Failed to add News Feed to board");
    } finally {
      setIsSaving(false);
    }
  };

  const canSubmit =
    !isSaving &&
    widgetTitle.trim().length > 0 &&
    (mode === "existing" ? !!selectedBoardId : newBoardTitle.trim().length > 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pin to Board</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Add a <strong className="text-[var(--color-text-primary)]">News Ticker</strong> widget
            to a board with the current filter settings.
          </p>

          {/* Active filter summary */}
          <p className="text-body-xs text-[var(--color-text-tertiary)]">
            {activeFilterParts.length > 0
              ? activeFilterParts.join(" · ")
              : "No filters — all intelligence items"}
          </p>

          {/* Widget title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm text-[var(--color-text-primary)]">Widget title</label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="News Feed"
            />
          </div>

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
              : "Pin to Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
