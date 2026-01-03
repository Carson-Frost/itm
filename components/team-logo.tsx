import { getTeamLogoUrl } from "@/lib/team-utils"

interface TeamLogoProps {
  team: string
  className?: string
}

export function TeamLogo({ team, className = "h-6 w-6" }: TeamLogoProps) {
  return (
    <img
      src={getTeamLogoUrl(team)}
      alt={team}
      className={className}
    />
  )
}
