/**
 * GitHub Trigger Service
 * Replaces strapi-plugin-update-static-content for Strapi 5
 * Triggers play14-web repository build via GitHub Actions API
 */

import type { Core } from "@strapi/strapi"

type GitHubTriggerParams = {
  strapi: Core.Strapi
}

type TriggerWorkflow = (reason?: string) => Promise<boolean>

type DebouncedTrigger = (reason?: string) => void

export default ({ strapi }: GitHubTriggerParams) => ({
  /**
   * Trigger GitHub Actions workflow
   * @param reason Description of what triggered the build
   */
  async triggerWorkflow(reason = "Content updated"): Promise<boolean> {
    const config = {
      githubToken: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER || "play14team",
      repo: process.env.GITHUB_REPO || "play14-web",
      workflowId: process.env.GITHUB_WORKFLOW_ID || "217740349",
      branch: process.env.GITHUB_BRANCH || "main",
    }

    if (!config.githubToken) {
      strapi.log.warn("[GitHub Trigger] GITHUB_TOKEN not configured, skipping workflow trigger")
      return false
    }

    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/dispatches`

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `token ${config.githubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: config.branch,
          inputs: {},
        }),
      })

      if (response.ok) {
        strapi.log.info(
          `[GitHub Trigger] ✅ Successfully triggered ${config.repo} build: ${reason}`
        )
        return true
      }

      const errorText = await response.text()
      strapi.log.error(
        `[GitHub Trigger] ❌ Failed to trigger workflow: ${response.status} ${response.statusText}`,
        errorText
      )
      return false
    } catch (error) {
      strapi.log.error("[GitHub Trigger] ❌ Error triggering workflow:", error)
      return false
    }
  },

  /**
   * Debounced trigger to prevent multiple rapid calls
   */
  debouncedTrigger: (() => {
    let timeoutId: NodeJS.Timeout | null = null
    const pendingReasons = new Set<string>()

    return (reason = "Content updated") => {
      pendingReasons.add(reason)

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        const combinedReason =
          pendingReasons.size === 1
            ? Array.from(pendingReasons)[0]
            : `Multiple updates: ${Array.from(pendingReasons).join(", ")}`

        pendingReasons.clear()
        await (
          strapi.service("api::github-trigger.github-trigger") as {
            triggerWorkflow: TriggerWorkflow
          }
        ).triggerWorkflow(combinedReason)
      }, 5000) // 5 second debounce
    }
  })() as DebouncedTrigger,
})
