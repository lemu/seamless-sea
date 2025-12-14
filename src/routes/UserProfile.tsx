import { useState } from "react";
import { useMutation } from "convex/react";
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { api } from "../../convex/_generated/api";

function UserProfile() {
  const { user, refreshUser } = useUser();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateUserAvatar = useMutation(api.users.updateUserAvatar);

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

    </div>
  );
}

export default UserProfile;
