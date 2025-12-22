/**
 * GitHub Trigger Service
 * Replaces strapi-plugin-update-static-content for Strapi 5
 * Triggers play14-ui repository build via GitHub Actions API
 */

module.exports = ({ strapi }) => ({
  /**
   * Trigger GitHub Actions workflow
   * @param {string} reason - Description of what triggered the build
   * @returns {Promise<boolean>} Success status
   */
  async triggerWorkflow(reason = "Content updated") {
    const config = {
      githubToken: process.env.GITHUB_TOKEN,
      owner: process.env.GITHUB_OWNER || "play14team",
      repo: process.env.GITHUB_REPO || "play14-ui",
      workflowId: process.env.GITHUB_WORKFLOW_ID || "217740349",
      branch: process.env.GITHUB_BRANCH || "main",
    };

    if (!config.githubToken) {
      strapi.log.warn(
        "[GitHub Trigger] GITHUB_TOKEN not configured, skipping workflow trigger",
      );
      return false;
    }

    try {
      const url = `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/dispatches`;

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
      });

      if (response.ok) {
        strapi.log.info(
          `[GitHub Trigger] ✅ Successfully triggered ${config.repo} build: ${reason}`,
        );
        return true;
      } else {
        const errorText = await response.text();
        strapi.log.error(
          `[GitHub Trigger] ❌ Failed to trigger workflow: ${response.status} ${response.statusText}`,
          errorText,
        );
        return false;
      }
    } catch (error) {
      strapi.log.error(
        `[GitHub Trigger] ❌ Error triggering workflow:`,
        error.message,
      );
      return false;
    }
  },

  /**
   * Debounced trigger to prevent multiple rapid calls
   */
  debouncedTrigger: (() => {
    let timeoutId = null;
    let pendingReasons = new Set();

    return (reason = "Content updated") => {
      pendingReasons.add(reason);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        const combinedReason =
          pendingReasons.size === 1
            ? Array.from(pendingReasons)[0]
            : `Multiple updates: ${Array.from(pendingReasons).join(", ")}`;

        pendingReasons.clear();
        await strapi
          .service("api::github-trigger.github-trigger")
          .triggerWorkflow(combinedReason);
      }, 5000); // 5 second debounce
    };
  })(),
});
