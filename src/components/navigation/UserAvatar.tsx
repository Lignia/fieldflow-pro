import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface UserAvatarProps {
  name: string;
  size?: "sm" | "md";
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
};

export function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  const initials = getInitials(name);
  const color = COLORS[hashName(name) % COLORS.length];

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium shrink-0",
        sizeMap[size],
        color
      )}
    >
      {initials}
    </div>
  );
}
