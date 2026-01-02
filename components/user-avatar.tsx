import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { generateAvatarUrl, defaultAvatarConfig, type AvatarConfig } from "@/lib/avatar-utils"

interface UserAvatarProps {
  username?: string | null
  avatarConfig?: AvatarConfig
  className?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function UserAvatar({ username, avatarConfig, className }: UserAvatarProps) {
  const avatarUrl = avatarConfig
    ? generateAvatarUrl(avatarConfig)
    : generateAvatarUrl(defaultAvatarConfig)

  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={username || "User"} />
      <AvatarFallback>{getInitials(username)}</AvatarFallback>
    </Avatar>
  )
}
