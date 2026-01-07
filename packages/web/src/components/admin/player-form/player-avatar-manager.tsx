"use client"

import { useRouter } from "next/navigation"
import { uploadPlayerPicture, deletePlayerPicture } from "@/libs/api/players"
import {
  setPlayerAvatarFromLibrary,
  removePlayerAvatar,
  uploadPlayerAvatar,
} from "@/app/(admin)/admin/players/players.action"
import { useToast } from "../toast"
import ImageManager from "../image-manager"

const AVATAR_OUTPUT_SIZE = 400

interface Props {
  playerId: string
  playerSlug: string
  avatar: { url: string } | null | undefined
  mode: "self" | "admin"
  showLibraryButton: boolean
  onAvatarChange: (avatar: { url: string } | null | undefined) => void
}

export default function PlayerAvatarManager({
  playerId,
  playerSlug,
  avatar,
  mode,
  showLibraryButton,
  onAvatarChange,
}: Props) {
  const router = useRouter()
  const toast = useToast()

  const handleUpload = async (blob: Blob) => {
    const croppedFile = new File([blob], `${playerSlug}.webp`, {
      type: "image/webp",
    })

    if (mode === "self") {
      const result = await uploadPlayerPicture(croppedFile)
      if (result.success && result.player) {
        onAvatarChange(result.player.avatar)
        toast.success("Avatar updated!")
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to upload avatar")
      }
    } else {
      const formData = new FormData()
      formData.append("files", croppedFile)
      const result = await uploadPlayerAvatar(playerId, formData)
      if (result.success) {
        if (result.avatarUrl) {
          onAvatarChange({ url: result.avatarUrl })
        }
        toast.success("Avatar uploaded!")
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to upload avatar")
      }
    }
  }

  const handleRemove = async () => {
    if (mode === "self") {
      const result = await deletePlayerPicture()
      if (result.success && result.player) {
        onAvatarChange(result.player.avatar)
        toast.success("Avatar removed")
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to delete avatar")
      }
    } else {
      const result = await removePlayerAvatar(playerId)
      if (result.success) {
        onAvatarChange(null)
        toast.success("Avatar removed!")
        router.refresh()
      } else {
        throw new Error(result.error || "Failed to remove avatar")
      }
    }
  }

  const handleLibrarySelect = async (imageId: number, imageUrl: string) => {
    // Library is only available in admin mode or for organizers
    const result = await setPlayerAvatarFromLibrary(playerId, imageId)
    if (result.success) {
      onAvatarChange({ url: imageUrl })
      toast.success("Avatar updated!")
      router.refresh()
    } else {
      throw new Error(result.error || "Failed to set avatar from library")
    }
  }

  return (
    <ImageManager
      image={avatar}
      onUpload={handleUpload}
      onRemove={handleRemove}
      onLibrarySelect={showLibraryButton ? handleLibrarySelect : undefined}
      outputSize={AVATAR_OUTPUT_SIZE}
      title="Avatar"
      description="A square profile picture (400x400 recommended)."
      showLibraryButton={showLibraryButton}
      libraryTitle="Select Avatar"
    />
  )
}
