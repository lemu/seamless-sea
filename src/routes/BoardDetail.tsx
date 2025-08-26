import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useParams, useNavigate } from "react-router";
import { Button, Icon } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../contexts/UserContext";
import { api } from "../../convex/_generated/api";

function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Get the board data
  const board = useQuery(
    api.boards.getBoardById,
    id ? { boardId: id as any } : "skip",
  );

  // Get user's organizations to check permissions
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user ? { userId: user._id } : "skip",
  );

  const updateBoard = useMutation(api.boards.updateBoard);
  const deleteBoard = useMutation(api.boards.deleteBoard);

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

  if (!user) {
    return (
      <div className="p-6">
        <p>Please log in to view this board.</p>
      </div>
    );
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
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/boards")}
              className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <Icon name="arrow-left" size="sm" />
              Back to Boards
            </Button>
          </div>

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
                📊 {board.title}
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
            <Button icon="cog" iconPosition="left">
              Settings
            </Button>
            <Button
              variant="destructive"
              icon="trash-2"
              iconPosition="left"
              onClick={handleDeleteBoard}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Board Content - Empty State */}
      <div className="flex min-h-[500px] items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border-primary-subtle)]">
        <div className="text-center">
          <Icon
            name="plus"
            size="xl"
            className="mx-auto mb-4 text-[var(--color-text-tertiary)]"
          />
          <h3 className="text-heading-lg mb-2 text-[var(--color-text-primary)]">
            Add widgets
          </h3>
          <p className="text-body-md mb-4 max-w-sm text-[var(--color-text-secondary)]">
            This board is empty. Start building your dashboard by adding widgets
            like charts, tables, and metrics.
          </p>
          <Button icon="plus" iconPosition="left">
            Add Widget
          </Button>
        </div>
      </div>

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
    </div>
  );
}

export default BoardDetail;
