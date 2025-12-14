import { Button, Card, CardHeader, CardContent } from "@rafal.lemieszewski/tide-ui";
import { useUser } from "../hooks";
import { useNavigate } from "react-router";

interface UserProfileModalProps {
  onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    onClose();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h2 className="text-xl font-bold">Profile</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary)] text-white font-semibold text-xl">
            {getInitials(user.name)}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{user.name}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{user.email}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Email Verified:</span>
            <span>{user.emailVerified ? "Yes" : "No"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">Member Since:</span>
            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
