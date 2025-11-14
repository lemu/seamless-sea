import { useState } from "react";
import { useMutation } from "convex/react";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
} from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { api } from "../../convex/_generated/api";
import { getSessionToken } from "../lib/auth-client";

function UserProfile() {
  const { user, refreshUser } = useUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);
  const changePasswordMutation = useMutation(api.auth.changePassword);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError("");

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: file,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { storageId } = await response.json();

      // Update user avatar in database
      await updateUserAvatar({ userId: user._id, avatarId: storageId });

      // Manually refresh the user data to get the updated avatar
      console.log("Avatar updated in database, refreshing user data...");
      refreshUser?.();
    } catch (error) {
      setError("Failed to upload avatar");
      console.error("Avatar upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="m-6 space-y-6 p-4">
        <div className="mb-6">
          <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
            👤 User Profile
          </h1>
          <p className="text-body-lg text-[var(--color-text-secondary)]">
            Please log in to view your profile
          </p>
        </div>
      </div>
    );
  }

  // Get user initials for default avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    // Validation
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    const token = getSessionToken();
    if (!token) {
      setPasswordError("Session expired. Please sign in again.");
      return;
    }

    setChangingPassword(true);

    try {
      await changePasswordMutation({
        token,
        currentPassword,
        newPassword,
      });

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Password change error:", err);
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("Failed to change password. Please try again.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="m-6 space-y-6 p-4">
      <div className="mb-6">
        <h1 className="text-heading-lg font-bold text-[var(--color-text-primary)]">
          User Profile
        </h1>
        <p className="text-body-lg text-[var(--color-text-secondary)]">
          Manage your user profile and personal settings
        </p>
      </div>

      <div className="space-y-6 rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <Avatar size="xl">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-heading-md text-[var(--color-text-primary)]">
              {user.name}
            </h3>
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              {user.email}
            </p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div>
          <label className="text-body-md mb-2 block font-medium text-[var(--color-text-primary)]">
            Profile Picture
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
              id="avatar-upload"
            />
            <Button
              onClick={() => document.getElementById("avatar-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Change Avatar"}
            </Button>
          </div>
          {error && (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Change Section */}
      <div className="space-y-6 rounded-lg border border-[var(--color-border-primary-subtle)] p-6">
        <div>
          <h2 className="text-heading-md mb-2 text-[var(--color-text-primary)]">
            Change Password
          </h2>
          <p className="text-body-sm text-[var(--color-text-secondary)]">
            Update your password to keep your account secure
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="text-body-sm mb-2 block font-medium text-[var(--color-text-primary)]"
            >
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changingPassword}
              required
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="text-body-sm mb-2 block font-medium text-[var(--color-text-primary)]"
            >
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changingPassword}
              required
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="text-body-sm mb-2 block font-medium text-[var(--color-text-primary)]"
            >
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={changingPassword}
              required
              minLength={8}
            />
          </div>

          {passwordError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">{passwordSuccess}</p>
            </div>
          )}

          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? "Changing Password…" : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default UserProfile;
