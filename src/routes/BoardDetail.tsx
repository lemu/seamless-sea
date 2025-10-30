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
  Editable,
  EditablePreview,
  EditableInput,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { api } from "../../convex/_generated/api";
import { BoardDetailSkeleton } from "../components/BoardDetailSkeleton";
import { WidgetGrid, AddWidgetModal } from "../components/widgets";
import type { Id } from "../../convex/_generated/dataModel";

// Clean implementation using our new Editable component
const BoardTitle = ({ boardId, title, isOwner }: {
  boardId: string;
  title: string;
  isOwner: boolean;
}) => {
  const updateBoard = useMutation(api.boards.updateBoard);

  const handleSubmit = async (newTitle: string) => {
    try {
      await updateBoard({
        boardId: boardId as Id<"boards">,
        title: newTitle.trim(),
      });
    } catch (error) {
      console.error("Failed to update board:", error);
    }
  };

  const sharedStyles = {
    fontSize: '1.75rem',
    lineHeight: '2.25rem',
    fontWeight: '700',
    color: 'var(--color-text-primary)',
    fontFamily: 'inherit',
    padding: '0.25rem 0.5rem',
    margin: '0',
  };

  return (
    <div style={{ marginLeft: '-0.5rem', display: 'inline-block' }}>
      <Editable
        defaultValue={title}
        onSubmit={handleSubmit}
        disabled={!isOwner}
        placeholder="Enter board title..."
      >
        <EditablePreview
          className="cursor-pointer hover:bg-[var(--color-background-neutral-subtle)] rounded-md transition-colors"
          style={{
            ...sharedStyles,
            minHeight: '2.25rem',
            display: 'flex',
            alignItems: 'center',
          }}
        />
        <EditableInput
          className="outline-none rounded-md"
          style={{
            ...sharedStyles,
            border: 'none',
            background: 'transparent',
            boxShadow: '0 0 0 2px var(--color-border-brand)',
          }}
          autoResize
          minWidth={120}
          charWidth={16}
        />
      </Editable>
    </div>
  );
};

function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const deleteBoard = useMutation(api.boards.deleteBoard);


  const handleDeleteBoard = () => {
    setShowDeleteDialog(true);
  };

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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
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
      <div className="m-6 p-6">
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
    <div className="m-6 space-y-6 max-w-full min-w-0" style={{ padding: 'var(--page-padding)' }}>
      {/* Header with Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="mb-2 min-w-0 flex-1">
            {board && (
              <BoardTitle
                boardId={board._id}
                title={board.title}
                isOwner={isOwner}
              />
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                icon="plus"
                iconPosition="left"
                onClick={handleAddWidget}
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
                    onClick={handleDeleteBoard}
                    className="cursor-pointer text-[var(--color-text-destructive)] hover:bg-[var(--color-background-destructive-subtle)] hover:text-[var(--color-text-destructive)]"
                  >
                    Delete Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="text-body-sm flex items-center gap-4 text-[var(--color-text-secondary)]">
          <span>Created {formatDate(board.createdAt)}</span>
          {board.updatedAt !== board.createdAt && (
            <span>Updated {formatDate(board.updatedAt)}</span>
          )}
        </div>
      </div>

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
    </div>
  );
}

export default BoardDetail;
