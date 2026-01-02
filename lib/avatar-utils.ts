import { createAvatar } from "@dicebear/core"
import { botttsNeutral } from "@dicebear/collection"

export interface AvatarConfig {
  seed: string
  flip?: boolean
  scale?: number
  backgroundColor?: string
  backgroundType?: "gradientLinear" | "solid"
  backgroundRotation?: number
  eyes?: string
  mouth?: string
}

export const defaultAvatarConfig: AvatarConfig = {
  seed: "default",
  scale: 100,
  backgroundColor: "1e88e5",
  backgroundType: "solid",
}

const eyesOptions = [
  "bulging",
  "dizzy",
  "eva",
  "frame1",
  "frame2",
  "glow",
  "happy",
  "robocop",
  "round",
  "roundFrame01",
  "roundFrame02",
  "sensor",
  "shade01",
]

const mouthOptions = [
  "diagram",
  "grill01",
  "grill02",
  "grill03",
  "smile01",
  "smile02",
  "square01",
]

export function generateRandomColor(): string {
  return Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
}

export function randomizeAvatarConfig(): AvatarConfig {
  return {
    seed: Math.random().toString(36).substring(7),
    flip: Math.random() > 0.5,
    scale: Math.floor(Math.random() * 76) + 75,
    backgroundColor: generateRandomColor(),
    backgroundType: Math.random() > 0.5 ? "gradientLinear" : "solid",
    backgroundRotation: Math.floor(Math.random() * 360),
    eyes: eyesOptions[Math.floor(Math.random() * eyesOptions.length)],
    mouth: mouthOptions[Math.floor(Math.random() * mouthOptions.length)],
  }
}

export function generateAvatarUrl(config: AvatarConfig): string {
  const options: Record<string, any> = {
    seed: config.seed,
    size: 128,
  }

  if (config.flip !== undefined) options.flip = config.flip
  if (config.scale !== undefined) options.scale = config.scale
  if (config.backgroundColor) options.backgroundColor = [config.backgroundColor]
  if (config.backgroundType) options.backgroundType = [config.backgroundType]
  if (config.backgroundRotation !== undefined) options.backgroundRotation = [config.backgroundRotation]
  if (config.eyes) options.eyes = [config.eyes]
  if (config.mouth) options.mouth = [config.mouth]

  const avatar = createAvatar(botttsNeutral, options)
  return avatar.toDataUri()
}
