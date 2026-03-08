"use server"

import { strapiFetch } from "@/libs/strapi-client"

export interface SettingsData {
  defaultTshirtSize: string
  defaultFoodPreferences: string
  email: string
  username: string
}

interface FindMeResponse {
  data: {
    defaultTshirtSize?: string
    defaultFoodPreferences?: string
  }
  user: {
    email: string
    username: string
  }
}

/**
 * Fetch the current user's settings (private fields + user info)
 */
export async function getMySettings(): Promise<SettingsData | null> {
  const result = await strapiFetch<FindMeResponse>("/admin/players/me")

  if (!result.ok || !result.data) {
    return null
  }

  return {
    defaultTshirtSize: result.data.data?.defaultTshirtSize || "none",
    defaultFoodPreferences: result.data.data?.defaultFoodPreferences || "",
    email: result.data.user?.email || "",
    username: result.data.user?.username || "",
  }
}

interface UpdateSettingsResult {
  success: boolean
  error?: string
}

/**
 * Update the current user's event default settings
 */
export async function updateMySettings(data: {
  defaultTshirtSize: string
  defaultFoodPreferences: string
}): Promise<UpdateSettingsResult> {
  const result = await strapiFetch(
    "/admin/players/me",
    {},
    {
      method: "PUT",
      body: {
        data: {
          defaultTshirtSize: data.defaultTshirtSize,
          defaultFoodPreferences: data.defaultFoodPreferences,
        },
      },
    }
  )

  if (!result.ok) {
    return { success: false, error: result.error || "Failed to update settings" }
  }

  return { success: true }
}

interface ChangePasswordResponse {
  jwt: string
  user: {
    id: number
    username: string
    email: string
  }
}

/**
 * Change the current user's password via Strapi's built-in endpoint
 */
export async function changePassword(
  currentPassword: string,
  password: string,
  passwordConfirmation: string
): Promise<UpdateSettingsResult> {
  if (!currentPassword || !password || !passwordConfirmation) {
    return { success: false, error: "All password fields are required" }
  }

  if (password !== passwordConfirmation) {
    return { success: false, error: "New passwords do not match" }
  }

  if (password.length < 8) {
    return { success: false, error: "New password must be at least 8 characters" }
  }

  const result = await strapiFetch<ChangePasswordResponse>(
    "/auth/change-password",
    {},
    {
      method: "POST",
      body: {
        currentPassword,
        password,
        passwordConfirmation,
      },
    }
  )

  if (!result.ok) {
    return {
      success: false,
      error: result.error || "Failed to change password",
    }
  }

  return { success: true }
}
