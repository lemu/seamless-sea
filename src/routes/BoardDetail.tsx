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
} from "@rafal.lemieszewski/tide-ui";
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

  // Calculate ownership early for header actions
  const isOwner = board && user?._id ? board.userId === user._id : false;

  // Memoize header actions to prevent infinite re-render loop
  const headerActions = useMemo(
    () =>
      board && user && isOwner ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            icon="plus"
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
    [board, user, isOwner, setIsAddingWidget, setShowAddWidgetModal, setShowDeleteDialog]
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

  // Check if user has access to this board
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
    <div className="m-6 flex flex-col gap-[var(--space-lg)]">
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
