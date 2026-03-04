import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import {
  Button,
  Icon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  toast,
} from "@rafal.lemieszewski/tide-ui";
import { Plus, Lock, Share2 } from "lucide-react";
import { useUser, useHeaderActions } from "../hooks";
import { api } from "../../convex/_generated/api";
import { BoardDetailSkeleton } from "../components/BoardDetailSkeleton";
import { WidgetGrid, AddWidgetModal } from "../components/widgets";
import type { Id } from "../../convex/_generated/dataModel";

function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Get the board data
  const board = useQuery(
    api.boards.getBoardById,
    id ? { boardId: id as Id<"boards"> } : "skip",
  );

  // Get user's organizations to check permissions
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?._id ? { userId: user._id } : "skip",
  );

  const deleteBoard = useMutation(api.boards.deleteBoard);
  const updateBoard = useMutation(api.boards.updateBoard);

  // Calculate ownership early for header actions
  const isOwner = board && user?._id ? board.userId === user._id : false;

  // Memoize header actions to prevent infinite re-render loop
  const headerActions = useMemo(
    () =>
      board && user && isOwner ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            icon={Share2}
            iconPosition="left"
            onClick={() => setShowShareDialog(true)}
          >
            Share
          </Button>

          <Button
            variant="secondary"
            icon={Plus}
            iconPosition="left"
            onClick={() => {
              setIsAddingWidget(true);
              setShowAddWidgetModal(true);
            }}
          >
            Add widget
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button icon="more-horizontal" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                icon="trash-2"
                onClick={() => setShowDeleteDialog(true)}
                className="cursor-pointer text-[var(--color-text-destructive)] hover:bg-[var(--color-background-destructive-subtle)] hover:text-[var(--color-text-destructive)]"
              >
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null,
    [board, user, isOwner, setIsAddingWidget, setShowAddWidgetModal, setShowDeleteDialog, setShowShareDialog]
  );

  // Set header actions
  useHeaderActions(headerActions);



  const handleConfirmDelete = async () => {
    if (!board) return;

    setIsDeleting(true);
    try {
      await deleteBoard({ boardId: board._id });
      navigate("/boards");
    } catch (error) {
      console.error("Failed to delete board:", error);
      alert("Failed to delete board");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };


  const handleAddWidget = () => {
    setIsAddingWidget(true);
    setShowAddWidgetModal(true);
  };

  const handleWidgetCreated = () => {
    // Widget was successfully created, keep isAddingWidget true
    // so WidgetGrid can detect and scroll to the new widget
    setShowAddWidgetModal(false);
  };

  const handleModalClose = () => {
    // Reset adding state if modal is closed without creating widget
    setIsAddingWidget(false);
    setShowAddWidgetModal(false);
  };

  const handleScrollComplete = () => {
    // Called by WidgetGrid after scrolling to new widget is complete
    setIsAddingWidget(false);
  };


  if (!user) {
    return (
      <div className="m-6 p-6">
        <p>Please log in to view this board.</p>
      </div>
    );
  }

  // Show loading skeleton while board data is loading
  if (board === undefined) {
    return <BoardDetailSkeleton />;
  }

  if (!board) {
    return (
      <div className="m-6 p-6">
        <div className="py-12 text-center">
          <Icon
            name="alert-circle"
            size="l"
            className="mx-auto mb-4 text-[var(--color-text-tertiary)]"
          />
          <h3 className="text-heading-lg mb-2 text-[var(--color-text-primary)]">
            Board not found
          </h3>
          <p className="text-body-md mb-4 text-[var(--color-text-secondary)]">
            This board may have been deleted or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/boards")}>Back to Boards</Button>
        </div>
      </div>
    );
  }

  // Check if user has access to this board
  const hasAccess =
    isOwner ||
    userOrganizations?.some((org) => org._id === board.organizationId);

  if (!hasAccess) {
    return (
      <div className="m-6 p-6">
        <div className="py-12 text-center">
          <Icon
            name={Lock}
            size="l"
            className="mx-auto mb-4 text-[var(--color-text-tertiary)]"
          />
          <h3 className="text-heading-lg mb-2 text-[var(--color-text-primary)]">
            Access denied
          </h3>
          <p className="text-body-md mb-4 text-[var(--color-text-secondary)]">
            You don't have permission to view this board.
          </p>
          <Button onClick={() => navigate("/boards")}>Back to Boards</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      {/* Board Content - Widget Grid */}
      <div key="widget-grid-container">
        <WidgetGrid
          boardId={board._id}
          isEditable={isOwner}
          onAddWidget={handleAddWidget}
          isAddingWidget={isAddingWidget}
          onScrollComplete={handleScrollComplete}
        />
      </div>

      {/* Board Description */}
      {board.description && (
        <div className="rounded-l bg-[var(--color-background-neutral-subtle)] p-4">
          <h4 className="text-heading-sm mb-2 text-[var(--color-text-primary)]">
            Description
          </h4>
          <p className="text-body-md text-[var(--color-text-secondary)]">
            {board.description}
          </p>
        </div>
      )}

      {/* Add Widget Modal */}
      <AddWidgetModal
        isOpen={showAddWidgetModal}
        onClose={handleModalClose}
        onWidgetCreated={handleWidgetCreated}
        boardId={board._id}
      />

      {/* Delete Board Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-body-md text-[var(--color-text-primary)]">
              Are you sure you want to delete <strong>'{board?.title}'</strong>?
              This action cannot be undone and all widgets will be permanently removed.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Board"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Board Dialog */}
      {board && (
        <ShareBoardDialog
          board={board}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          onVisibilityChange={async (visibility) => {
            try {
              await updateBoard({ boardId: board._id, visibility });
              toast.success(
                visibility === "org_view"
                  ? "Board is now visible to your organisation"
                  : "Board is now private"
              );
            } catch (error) {
              console.error("Failed to update visibility:", error);
              toast.error("Failed to update sharing settings");
            }
          }}
        />
      )}
    </div>
  );
}

// ── Share Board Dialog ────────────────────────────────────────────────────────

interface ShareBoardDialogProps {
  board: { _id: Id<"boards">; title: string; visibility?: "private" | "org_view" | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVisibilityChange: (visibility: "private" | "org_view") => Promise<void>;
}

function ShareBoardDialog({ board, open, onOpenChange, onVisibilityChange }: ShareBoardDialogProps) {
  const currentVisibility = board.visibility ?? "private";
  const [selected, setSelected] = useState<"private" | "org_view">(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty = selected !== currentVisibility;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onVisibilityChange(selected);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{board.title}"</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <label className="flex items-start gap-3 cursor-pointer rounded-l border border-[var(--color-border-primary-subtle)] p-4 transition-colors hover:border-[var(--color-border-primary-hovered)]" style={selected === "private" ? { borderColor: "var(--color-border-brand)" } : {}}>
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={selected === "private"}
              onChange={() => setSelected("private")}
              className="mt-0.5 accent-[var(--color-text-brand-bold)]"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-body-md font-medium text-[var(--color-text-primary)]">Private</span>
              <span className="text-body-sm text-[var(--color-text-secondary)]">Only you can see and edit this board.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer rounded-l border border-[var(--color-border-primary-subtle)] p-4 transition-colors hover:border-[var(--color-border-primary-hovered)]" style={selected === "org_view" ? { borderColor: "var(--color-border-brand)" } : {}}>
            <input
              type="radio"
              name="visibility"
              value="org_view"
              checked={selected === "org_view"}
              onChange={() => setSelected("org_view")}
              className="mt-0.5 accent-[var(--color-text-brand-bold)]"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-body-md font-medium text-[var(--color-text-primary)]">Organisation — View only</span>
              <span className="text-body-sm text-[var(--color-text-secondary)]">Everyone in your organisation can view this board. They can duplicate it to make their own editable copy.</span>
            </div>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BoardDetail;
