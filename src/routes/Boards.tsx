import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, Outlet, useLocation } from "react-router";
import { Button, Icon } from "@rafal.lemieszewski/tide-ui";
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
    user ? { userId: user._id } : "skip",
  );
  const currentOrganization = userOrganizations?.[0];

  // Get all boards for user in current organization
  const boards = useQuery(
    api.boards.getBoardsByUserAndOrg,
    user && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  // Get pinned boards to show pin status
  const pinnedBoards = useQuery(
    api.boards.getPinnedBoards,
    user && currentOrganization?._id
      ? {
          userId: user._id,
          organizationId: currentOrganization._id,
        }
      : "skip",
  );

  const createBoard = useMutation(api.boards.createBoard);
  const pinBoard = useMutation(api.boards.pinBoard);
  const unpinBoard = useMutation(api.boards.unpinBoard);

  // Check if we're on a board detail page (child route)
  const isOnBoardDetail = location.pathname.match(/^\/boards\/[^/]+$/);

  // Memoize header actions to prevent infinite re-render loop
  const headerActions = useMemo(
    () =>
      !isOnBoardDetail ? (
        <Button
          variant="primary"
          icon="plus"
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
    if (!user || !currentOrganization?._id) return;

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
    if (!user || !currentOrganization?._id) return;

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
    if (!user || !currentOrganization?._id) return;

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
    <div className="m-6 flex flex-col gap-[var(--space-lg)]">
      {/* Boards Grid */}
      {boards && boards.length === 0 ? (
        <BoardsEmptyState onCreateBoard={() => setShowCreateModal(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards?.map((board) => (
            <div
              key={board._id}
              className="group relative cursor-pointer rounded-lg border border-[var(--color-border-primary-subtle)] p-4 transition-colors hover:border-[var(--color-border-primary-hovered)]"
              onClick={() => navigate(`/boards/${board._id}`)}
            >
              {/* Pin Button */}
              <button
                className="absolute top-2 right-2 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-background-neutral-subtle-hovered)]"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPinned(board._id)) {
                    handleUnpinBoard(board._id);
                  } else {
                    handlePinBoard(board._id);
                  }
                }}
              >
                <Icon
                  name={isPinned(board._id) ? "pin" : "pin-off"}
                  size="sm"
                  className={
                    isPinned(board._id)
                      ? "text-[var(--color-text-brand)]"
                      : "text-[var(--color-text-secondary)]"
                  }
                />
              </button>

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

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateBoard}
        />
      )}
    </div>
  );
}

// Simple modal component for board creation
function CreateBoardModal({
  onClose,
  onCreate,
}: {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-[var(--color-surface-primary)] p-6">
        <h2 className="text-heading-lg mb-4 text-[var(--color-text-primary)]">
          Create New Board
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-body-md mb-2 block text-[var(--color-text-primary)]">
              Board Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..."
              className="w-full rounded-md border border-[var(--color-border-primary-subtle)] px-3 py-2 focus:border-[var(--color-border-brand)] focus:outline-none"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Boards;
