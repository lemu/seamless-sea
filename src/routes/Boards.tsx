import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, Outlet, useLocation } from "react-router";
import { Plus, Copy } from "lucide-react";
import {
  Button,
  Icon,
  toast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Input,
  FormField,
  FormLabel,
  FormControl,
} from "@rafal.lemieszewski/tide-ui";
import { useUser, useHeaderActions } from "../hooks";
import { api } from "../../convex/_generated/api";
import { BoardsSkeleton, BoardsEmptyState } from "../components/BoardsSkeleton";
import type { Id } from "../../convex/_generated/dataModel";

function Boards() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get user's organizations (using first one for now)
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?._id ? { userId: user._id } : "skip",
  );
  const currentOrganization = userOrganizations?.[0];

  // Get all boards for user in current organization
  const boards = useQuery(
    api.boards.getBoardsByUserAndOrg,
    user?._id && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  // Get pinned boards to show pin status
  const pinnedBoards = useQuery(
    api.boards.getPinnedBoards,
    user?._id && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  // Get boards shared with the org
  const sharedBoards = useQuery(
    api.boards.getBoardsSharedWithOrg,
    user?._id && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  const createBoard = useMutation(api.boards.createBoard);
  const pinBoard = useMutation(api.boards.pinBoard);
  const unpinBoard = useMutation(api.boards.unpinBoard);
  const duplicateBoard = useMutation(api.boards.duplicateBoard);

  // Check if we're on a board detail page (child route)
  const isOnBoardDetail = location.pathname.match(/^\/boards\/[^/]+$/);

  // Memoize header actions to prevent infinite re-render loop
  const headerActions = useMemo(
    () =>
      !isOnBoardDetail ? (
        <Button
          variant="primary"
          icon={Plus}
          iconPosition="left"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 shrink-0"
        >
          New Board
        </Button>
      ) : null,
    [isOnBoardDetail]
  );

  // Set header actions (only for boards list, not detail page)
  useHeaderActions(headerActions);

  // If we're on a board detail page, render the Outlet
  if (isOnBoardDetail) {
    return <Outlet />;
  }

  const handleCreateBoard = async (title: string) => {
    if (!user?._id || !currentOrganization?._id) return;

    try {
      const boardId = await createBoard({
        title,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
      navigate(`/boards/${boardId}`);
    } catch (error) {
      console.error("Failed to create board:", error);
      alert("Failed to create board");
    }
  };

  const handlePinBoard = async (boardId: string) => {
    if (!user?._id || !currentOrganization?._id) return;

    try {
      await pinBoard({
        boardId: boardId as Id<"boards">,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
    } catch (error) {
      console.error("Failed to pin board:", error);
      alert(error instanceof Error ? error.message : "Failed to pin board");
    }
  };

  const handleUnpinBoard = async (boardId: string) => {
    if (!user?._id || !currentOrganization?._id) return;

    try {
      await unpinBoard({
        boardId: boardId as Id<"boards">,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
    } catch (error) {
      console.error("Failed to unpin board:", error);
      alert("Failed to unpin board");
    }
  };

  const handleDuplicateBoard = async (boardId: string) => {
    if (!user?._id || !currentOrganization?._id) return;

    try {
      const newBoardId = await duplicateBoard({
        boardId: boardId as Id<"boards">,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
      toast.success("Board duplicated to your boards", {
        action: {
          label: "Open",
          onClick: () => navigate(`/boards/${newBoardId}`),
        },
      });
    } catch (error) {
      console.error("Failed to duplicate board:", error);
      toast.error("Failed to duplicate board");
    }
  };

  const isPinned = (boardId: string) => {
    return pinnedBoards?.some((pinned) => pinned._id === boardId) ?? false;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="m-6 p-6">
        <p>Please log in to view your boards.</p>
      </div>
    );
  }

  // Show loading skeleton while any required data is loading
  if (
    userOrganizations === undefined ||
    (currentOrganization && boards === undefined) ||
    (currentOrganization && pinnedBoards === undefined)
  ) {
    return <BoardsSkeleton />;
  }

  return (
    <div className="m-6 flex flex-col gap-[var(--space-l)]">
      {/* Boards Grid */}
      {boards && boards.length === 0 ? (
        <BoardsEmptyState onCreateBoard={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards?.map((board) => (
            <div
              key={board._id}
              role="button"
              tabIndex={0}
              className="group relative cursor-pointer rounded-l border border-[var(--color-border-primary-subtle)] p-4 transition-colors hover:border-[var(--color-border-primary-hovered)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-brand)]"
              onClick={() => navigate(`/boards/${board._id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/boards/${board._id}`);
                }
              }}
              aria-label={`Open board: ${board.title}`}
            >
              {/* Pin Button */}
              <Button
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPinned(board._id)) {
                    handleUnpinBoard(board._id);
                  } else {
                    handlePinBoard(board._id);
                  }
                }}
                aria-label={isPinned(board._id) ? `Unpin board: ${board.title}` : `Pin board: ${board.title}`}
              >
                <Icon
                  name={isPinned(board._id) ? "pin" : "pin-off"}
                  size="s"
                  className={
                    isPinned(board._id)
                      ? "text-[var(--color-text-brand-bold)]"
                      : "text-[var(--color-text-secondary)]"
                  }
                />
              </Button>

              {/* Board Content */}
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-heading-md truncate text-[var(--color-text-primary)]">
                  {board.title}
                </h3>
              </div>

              {board.description && (
                <p className="text-body-sm mb-3 text-[var(--color-text-secondary)]">
                  {board.description}
                </p>
              )}

              <div className="text-caption-sm flex items-center justify-between text-[var(--color-text-tertiary)]">
                <span>Created {formatDate(board.createdAt)}</span>
                {isPinned(board._id) && (
                  <span className="text-[var(--color-text-brand)]">Pinned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared with org section */}
      {sharedBoards && sharedBoards.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-heading-sm text-[var(--color-text-primary)]">Shared with your organisation</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sharedBoards.map((board) => (
              <div
                key={board._id}
                className="group relative rounded-l border border-[var(--color-border-primary-subtle)] p-4"
              >
                {/* Duplicate Button */}
                <Button
                  variant="ghost"
                  className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  onClick={() => handleDuplicateBoard(board._id)}
                  aria-label={`Duplicate board: ${board.title}`}
                  title="Duplicate to my boards"
                >
                  <Copy size={14} className="text-[var(--color-text-secondary)]" />
                </Button>

                {/* View link */}
                <div
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus:outline-none"
                  onClick={() => navigate(`/boards/${board._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/boards/${board._id}`);
                    }
                  }}
                  aria-label={`View board: ${board.title}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-heading-md truncate text-[var(--color-text-primary)]">
                      {board.title}
                    </h3>
                  </div>
                  {board.description && (
                    <p className="text-body-sm mb-3 text-[var(--color-text-secondary)]">
                      {board.description}
                    </p>
                  )}
                  <div className="text-caption-sm flex items-center justify-between text-[var(--color-text-tertiary)]">
                    <span>Shared • {formatDate(board.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      <CreateBoardModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateBoard}
      />
    </div>
  );
}

function CreateBoardModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreate(title.trim());
      onClose();
    } catch (error) {
      console.error("Failed to create board:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <FormField>
              <FormLabel>Board title</FormLabel>
              <FormControl>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter board title…"
                  disabled={isCreating}
                  autoFocus
                />
              </FormControl>
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? "Creating…" : "Create board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Boards;
