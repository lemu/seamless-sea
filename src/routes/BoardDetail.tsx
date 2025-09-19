import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import {
  Button,
  Icon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { api } from "../../convex/_generated/api";
import { BoardDetailSkeleton } from "../components/BoardDetailSkeleton";
import { WidgetGrid, AddWidgetModal } from "../components/widgets";
import type { Id } from "../../convex/_generated/dataModel";

function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);

  // Get the board data
  const board = useQuery(
    api.boards.getBoardById,
    id ? { boardId: id as Id<"boards"> } : "skip",
  );

  // Get user's organizations to check permissions
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user ? { userId: user._id } : "skip",
  );

  const updateBoard = useMutation(api.boards.updateBoard);
  const deleteBoard = useMutation(api.boards.deleteBoard);
  const updateBoardLayout = useMutation(api.widgets.updateBoardLayout);

  // Get widgets for cleanup functionality
  const widgets = useQuery(
    api.widgets.getWidgetsByBoard,
    id ? { boardId: id as Id<"boards"> } : "skip",
  );
  const layouts = useQuery(
    api.widgets.getBoardLayouts,
    id ? { boardId: id as Id<"boards"> } : "skip",
  );

  const handleEditTitle = () => {
    if (!board) return;
    setEditTitle(board.title);
    setIsEditing(true);
  };

  const handleSaveTitle = async () => {
    if (!board || !editTitle.trim()) return;

    try {
      await updateBoard({
        boardId: board._id,
        title: editTitle.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update board:", error);
      alert("Failed to update board title");
    }
  };

  const handleDeleteBoard = async () => {
    if (!board) return;

    const confirmed = confirm(
      "Are you sure you want to delete this board? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await deleteBoard({ boardId: board._id });
      navigate("/boards");
    } catch (error) {
      console.error("Failed to delete board:", error);
      alert("Failed to delete board");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleAddWidget = () => {
    setShowAddWidgetModal(true);
  };

  const handleCleanupWidgets = async () => {
    if (!board || !widgets || !layouts) return;

    try {
      // Define grid configuration (same as WidgetGrid)
      const breakpoints = { lg: 1200, md: 768, sm: 0 };
      const cols = { lg: 4, md: 2, sm: 1 };

      // Get current viewport width to determine breakpoint
      const currentBreakpoint = window.innerWidth >= 1200 ? 'lg' :
                               window.innerWidth >= 768 ? 'md' : 'sm';
      const currentCols = cols[currentBreakpoint as keyof typeof cols];

      // Get existing layouts for current breakpoint
      const currentLayouts = layouts[currentBreakpoint] || [];
      const widgetMap = new Map(widgets.map(w => [w._id, w]));

      // Sort widgets by their current position (top-left first)
      const sortedWidgets = currentLayouts
        .filter(layout => widgetMap.has(layout.i))
        .sort((a, b) => {
          if (a.y !== b.y) return a.y - b.y; // Sort by row first
          return a.x - b.x; // Then by column
        });

      // Create compact layout
      const compactLayout = [];
      let currentX = 0;
      let currentY = 0;

      for (const layout of sortedWidgets) {
        // Check if widget fits in current row
        if (currentX + layout.w > currentCols) {
          // Move to next row
          currentX = 0;
          currentY++;
        }

        // Place widget at current position
        compactLayout.push({
          i: layout.i,
          x: currentX,
          y: currentY,
          w: layout.w,
          h: layout.h,
        });

        // Update position for next widget
        currentX += layout.w;
      }

      // Update layout for current breakpoint
      await updateBoardLayout({
        boardId: board._id,
        breakpoint: currentBreakpoint,
        layout: compactLayout,
      });

    } catch (error) {
      console.error("Failed to cleanup widgets:", error);
      alert("Failed to cleanup widgets");
    }
  };

  if (!user) {
    return (
      <div className="p-6">
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
      <div className="p-6">
        <div className="py-12 text-center">
          <Icon
            name="alert-circle"
            size="lg"
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

  // Check if user owns this board
  const isOwner = board.userId === user._id;
  const hasAccess =
    isOwner ||
    userOrganizations?.some((org) => org._id === board.organizationId);

  if (!hasAccess) {
    return (
      <div className="p-6">
        <div className="py-12 text-center">
          <Icon
            name="lock"
            size="lg"
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {isEditing ? (
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-heading-2xlg border-b-2 border-[var(--color-border-brand)] bg-transparent text-[var(--color-text-primary)] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={handleSaveTitle}>
                <Icon name="check" size="sm" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                <Icon name="x" size="sm" />
              </Button>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-2">
              <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">
                {board.title}
              </h1>
              {isOwner && (
                <Button variant="ghost" size="sm" onClick={handleEditTitle}>
                  <Icon name="edit" size="sm" />
                </Button>
              )}
            </div>
          )}

          <div className="text-body-sm flex items-center gap-4 text-[var(--color-text-secondary)]">
            <span>Created {formatDate(board.createdAt)}</span>
            {board.updatedAt !== board.createdAt && (
              <span>Updated {formatDate(board.updatedAt)}</span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              icon="plus"
              iconPosition="left"
              onClick={handleAddWidget}
            >
              Add Widget
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Icon name="more-horizontal" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleCleanupWidgets}
                  className="cursor-pointer"
                >
                  <Icon name="layout" size="sm" />
                  <span>Cleanup Widgets</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteBoard}
                  className="cursor-pointer text-[var(--color-text-destructive)] hover:bg-[var(--color-background-destructive-subtle)] hover:text-[var(--color-text-destructive)]"
                >
                  <Icon name="trash-2" size="sm" />
                  <span>Delete Board</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Board Content - Widget Grid */}
      <WidgetGrid
        boardId={board._id}
        isEditable={isOwner}
        onAddWidget={handleAddWidget}
      />

      {/* Board Description */}
      {board.description && (
        <div className="rounded-lg bg-[var(--color-background-neutral-subtle)] p-4">
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
        onClose={() => setShowAddWidgetModal(false)}
        boardId={board._id}
      />
    </div>
  );
}

export default BoardDetail;
