import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useNavigate } from 'react-router';
import { Button, Icon } from "@rafal.lemieszewski/tide-ui";
import { useUser } from '../contexts/UserContext';
import { api } from '../../convex/_generated/api';

function Boards() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get user's organizations (using first one for now)
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user ? { userId: user._id } : "skip"
  );
  const currentOrganization = userOrganizations?.[0];

  // Get all boards for user in current organization
  const boards = useQuery(
    api.boards.getBoardsByUserAndOrg,
    user && currentOrganization ? { 
      userId: user._id, 
      organizationId: currentOrganization._id 
    } : "skip"
  );

  // Get pinned boards to show pin status
  const pinnedBoards = useQuery(
    api.boards.getPinnedBoards,
    user && currentOrganization ? { 
      userId: user._id, 
      organizationId: currentOrganization._id 
    } : "skip"
  );

  const createBoard = useMutation(api.boards.createBoard);
  const pinBoard = useMutation(api.boards.pinBoard);
  const unpinBoard = useMutation(api.boards.unpinBoard);

  const handleCreateBoard = async (title: string) => {
    if (!user || !currentOrganization) return;
    
    try {
      const boardId = await createBoard({
        title,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
      navigate(`/boards/${boardId}`);
    } catch (error) {
      console.error('Failed to create board:', error);
      alert('Failed to create board');
    }
  };

  const handlePinBoard = async (boardId: string) => {
    if (!user || !currentOrganization) return;
    
    try {
      await pinBoard({
        boardId: boardId as any,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
    } catch (error) {
      console.error('Failed to pin board:', error);
      alert(error instanceof Error ? error.message : 'Failed to pin board');
    }
  };

  const handleUnpinBoard = async (boardId: string) => {
    if (!user || !currentOrganization) return;
    
    try {
      await unpinBoard({
        boardId: boardId as any,
        userId: user._id,
        organizationId: currentOrganization._id,
      });
    } catch (error) {
      console.error('Failed to unpin board:', error);
      alert('Failed to unpin board');
    }
  };

  const isPinned = (boardId: string) => {
    return pinnedBoards?.some(pinned => pinned._id === boardId) ?? false;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="p-6">
        <p>Please log in to view your boards.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2xlg text-[var(--color-text-primary)]">📊 Boards</h1>
          <p className="text-body-lg text-[var(--color-text-secondary)]">
            Manage your dashboard boards
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Icon name="plus" size="sm" />
          New Board
        </Button>
      </div>

      {/* Boards Grid */}
      {!boards || boards.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="layout-dashboard" size="lg" className="mx-auto mb-4 text-[var(--color-text-tertiary)]" />
          <h3 className="text-heading-lg text-[var(--color-text-primary)] mb-2">No boards yet</h3>
          <p className="text-body-md text-[var(--color-text-secondary)] mb-4">
            Create your first board to get started with dashboards
          </p>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            Create Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <div
              key={board._id}
              className="group relative rounded-lg border border-[var(--color-border-primary-subtle)] p-4 hover:border-[var(--color-border-primary-hovered)] transition-colors cursor-pointer"
              onClick={() => navigate(`/boards/${board._id}`)}
            >
              {/* Pin Button */}
              <button
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[var(--color-background-neutral-subtle-hovered)] rounded"
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
                  className={isPinned(board._id) ? "text-[var(--color-text-brand)]" : "text-[var(--color-text-secondary)]"}
                />
              </button>

              {/* Board Content */}
              <div className="flex items-center gap-3 mb-3">
                <Icon name="layout-dashboard" size="md" className="text-[var(--color-text-brand)]" />
                <h3 className="text-heading-md text-[var(--color-text-primary)] truncate">
                  {board.title}
                </h3>
              </div>
              
              {board.description && (
                <p className="text-body-sm text-[var(--color-text-secondary)] mb-3">
                  {board.description}
                </p>
              )}

              <div className="flex items-center justify-between text-caption-sm text-[var(--color-text-tertiary)]">
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
function CreateBoardModal({ onClose, onCreate }: { 
  onClose: () => void; 
  onCreate: (title: string) => void; 
}) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      await onCreate(title.trim());
      onClose();
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--color-surface-primary)] rounded-lg p-6 w-full max-w-md">
        <h2 className="text-heading-lg text-[var(--color-text-primary)] mb-4">Create New Board</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-body-md text-[var(--color-text-primary)] mb-2">
              Board Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..."
              className="w-full px-3 py-2 border border-[var(--color-border-primary-subtle)] rounded-md focus:border-[var(--color-border-brand)] focus:outline-none"
              disabled={isCreating}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary"
              disabled={!title.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Boards;