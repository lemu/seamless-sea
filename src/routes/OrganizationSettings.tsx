import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import {
  Button,
  Input,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Card,
  CardHeader,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Spinner,
} from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const ROLES = ["Admin", "Trader", "Broker"] as const;
type Role = (typeof ROLES)[number];

function OrganizationSettings() {
  const { user } = useUser();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Trader");
  const [isInviting, setIsInviting] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  // Get user's organizations
  const userOrganizations = useQuery(
    api.organizations.getUserOrganizations,
    user?._id ? { userId: user._id } : "skip"
  );
  // Always use Acme organization for invitations and member management
  const currentOrganization = userOrganizations?.find(org => org.name === "Acme") || userOrganizations?.[0];

  // Dialog states
  const [removeMemberDialog, setRemoveMemberDialog] = useState<{
    open: boolean;
    membershipId?: Id<"memberships">;
    memberName?: string;
  }>({ open: false });
  const [revokeInviteDialog, setRevokeInviteDialog] = useState<{
    open: boolean;
    invitationId?: Id<"invitations">;
    email?: string;
  }>({ open: false });
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Get membership to check if user is admin
  const membership = useQuery(
    api.memberships.getMembership,
    user?._id && currentOrganization?._id
      ? { userId: user._id, organizationId: currentOrganization._id }
      : "skip"
  );

  const isAdmin = membership?.role === "Admin";

  // Get organization members
  const members = useQuery(
    api.memberships.getOrganizationMembers,
    currentOrganization?._id
      ? { organizationId: currentOrganization._id }
      : "skip"
  );

  // Get organization invitations (admin only)
  const invitations = useQuery(
    api.invitations.getOrganizationInvitations,
    isAdmin && user?._id && currentOrganization?._id
      ? { organizationId: currentOrganization._id, userId: user._id }
      : "skip"
  );

  const sendInvitation = useAction(api.invitations.sendInvitation);
  const createInvitationManual = useMutation(api.invitations.createInvitationManual);
  const removeMember = useMutation(api.memberships.removeMember);
  const revokeInvitation = useMutation(api.invitations.revokeInvitation);
  const deleteInvitation = useMutation(api.invitations.deleteInvitation);
  const updateMemberRole = useMutation(api.memberships.updateMemberRole);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?._id || !currentOrganization?._id) return;

    setInviteError("");
    setInviteSuccess(false);
    setIsInviting(true);

    try {
      await sendInvitation({
        email: inviteEmail,
        organizationId: currentOrganization._id,
        role: inviteRole,
        invitedBy: user._id,
      });
      setInviteEmail("");
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      console.error("Send invitation error:", err);
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!user?._id || !currentOrganization?._id || !inviteEmail) return;

    setInviteError("");
    setInviteSuccess(false);
    setGeneratedLink("");
    setIsGeneratingLink(true);

    try {
      const result = await createInvitationManual({
        email: inviteEmail,
        organizationId: currentOrganization._id,
        role: inviteRole,
        invitedBy: user._id,
      });
      const link = `${window.location.origin}/invite/${result.token}`;
      setGeneratedLink(link);
      setInviteEmail("");
    } catch (err) {
      console.error("Generate link error:", err);
      setInviteError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeMemberDialog.membershipId || !user?._id) return;

    setIsRemoving(true);
    try {
      await removeMember({
        membershipId: removeMemberDialog.membershipId,
        requestingUserId: user._id,
      });
      setRemoveMemberDialog({ open: false });
    } catch (err) {
      console.error("Remove member error:", err);
      alert(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRevokeInvitation = async () => {
    if (!revokeInviteDialog.invitationId || !user?._id) return;

    setIsRevoking(true);
    try {
      await revokeInvitation({
        invitationId: revokeInviteDialog.invitationId,
        userId: user._id,
      });
      setRevokeInviteDialog({ open: false });
    } catch (err) {
      console.error("Revoke invitation error:", err);
      alert(err instanceof Error ? err.message : "Failed to revoke invitation");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: Id<"invitations">) => {
    if (!user?._id) return;

    try {
      await deleteInvitation({
        invitationId,
        userId: user._id,
      });
    } catch (err) {
      console.error("Delete invitation error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete invitation");
    }
  };

  const handleRoleChange = async (
    membershipId: Id<"memberships">,
    newRole: string
  ) => {
    if (!user?._id) return;

    try {
      await updateMemberRole({
        membershipId,
        requestingUserId: user._id,
        newRole,
      });
    } catch (err) {
      console.error("Update role error:", err);
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "accepted":
        return <Badge className="bg-green-100 text-green-800">Accepted</Badge>;
      case "revoked":
        return <Badge className="bg-red-100 text-red-800">Revoked</Badge>;
      case "expired":
        return <Badge className="bg-gray-100 text-gray-800">Expired</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="m-6 space-y-6 p-4">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          Please log in to view organization settings.
        </p>
      </div>
    );
  }

  if (userOrganizations === undefined || membership === undefined) {
    return (
      <div className="m-6 flex items-center justify-center p-12">
        <Spinner size="lg" variant="primary" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="m-6 space-y-6 p-4">
        <p className="text-body-md text-[var(--color-text-secondary)]">
          You are not a member of any organization.
        </p>
      </div>
    );
  }

  return (
    <div className="m-6 space-y-6 p-4">
      <div className="mb-6">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          Organization Settings
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Manage members and invitations for {currentOrganization.name}
        </p>
      </div>

      {/* Invite Member Form (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="text-heading-md text-[var(--color-text-primary)]">
              Invite Member
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              {/* Organization selector - disabled to show which org is being used */}
              <div>
                <label htmlFor="organization" className="block text-sm font-medium mb-1">
                  Organization
                </label>
                <Select value={currentOrganization._id} disabled>
                  <SelectTrigger id="organization">
                    <SelectValue placeholder={currentOrganization.name} />
                  </SelectTrigger>
                  <SelectContent>
                    {userOrganizations?.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  All invitations will be sent to Acme organization
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    disabled={isInviting}
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium mb-1">
                    Role
                  </label>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as Role)}
                    disabled={isInviting}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={true}
                  >
                    Send Email (Disabled)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isInviting || isGeneratingLink || !inviteEmail}
                    onClick={handleGenerateLink}
                  >
                    {isGeneratingLink ? "Generating..." : "Generate Link"}
                  </Button>
                </div>
              </div>

              {inviteError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  {inviteError}
                </div>
              )}

              {inviteSuccess && (
                <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
                  Invitation sent successfully!
                </div>
              )}

              {generatedLink && (
                <div className="text-sm bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                  <p className="text-blue-800 font-medium">Invitation link generated:</p>
                  <div className="flex gap-2 items-center">
                    <code className="flex-1 text-xs bg-white p-2 rounded border border-blue-200 break-all">
                      {generatedLink}
                    </code>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <h2 className="text-heading-md text-[var(--color-text-primary)]">
            Members ({members?.length || 0})
          </h2>
        </CardHeader>
        <CardContent>
          {members === undefined ? (
            <div className="flex justify-center p-4">
              <Spinner variant="primary" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-body-md text-[var(--color-text-secondary)]">
              No members found.
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.membershipId}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-primary-subtle)] hover:bg-[var(--color-surface-secondary)]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar size="md">
                      <AvatarImage src={member.avatarUrl || undefined} alt={member.name} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-body-md font-medium text-[var(--color-text-primary)]">
                        {member.name}
                        {member.userId === user._id && (
                          <span className="text-[var(--color-text-tertiary)]"> (You)</span>
                        )}
                      </p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && member.userId !== user._id ? (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            handleRoleChange(member.membershipId, value)
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setRemoveMemberDialog({
                              open: true,
                              membershipId: member.membershipId,
                              memberName: member.name,
                            })
                          }
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">{member.role}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations (Admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <h2 className="text-heading-md text-[var(--color-text-primary)]">
              Invitations
            </h2>
          </CardHeader>
          <CardContent>
            {invitations === undefined ? (
              <div className="flex justify-center p-4">
                <Spinner variant="primary" />
              </div>
            ) : invitations.length === 0 ? (
              <p className="text-body-md text-[var(--color-text-secondary)]">
                No invitations yet.
              </p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invite) => (
                  <div
                    key={invite._id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-primary-subtle)]"
                  >
                    <div>
                      <p className="text-body-md font-medium text-[var(--color-text-primary)]">
                        {invite.email}
                      </p>
                      <p className="text-body-sm text-[var(--color-text-secondary)]">
                        Invited by {invite.inviterName} as {invite.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(invite.status)}
                      {invite.status === "pending" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setRevokeInviteDialog({
                              open: true,
                              invitationId: invite._id,
                              email: invite.email,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDeleteInvitation(invite._id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remove Member Dialog */}
      <Dialog open={removeMemberDialog.open} onOpenChange={(open) => setRemoveMemberDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-body-md text-[var(--color-text-primary)]">
              Are you sure you want to remove <strong>{removeMemberDialog.memberName}</strong> from the organization?
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRemoveMemberDialog({ open: false })}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isRemoving}
            >
              {isRemoving ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Invitation Dialog */}
      <Dialog open={revokeInviteDialog.open} onOpenChange={(open) => setRevokeInviteDialog({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke Invitation</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-body-md text-[var(--color-text-primary)]">
              Are you sure you want to revoke the invitation for <strong>{revokeInviteDialog.email}</strong>?
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setRevokeInviteDialog({ open: false })}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeInvitation}
              disabled={isRevoking}
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrganizationSettings;
