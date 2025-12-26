interface Config {
  githubToken?: string;
  owner: string;
  repo: string;
  workflowId: string;
}

interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  run_number: number;
  event: string;
  actor?: {
    login: string;
  };
  name: string;
}

interface MappedRun {
  id: number;
  status: string;
  conclusion: string | null;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
  runNumber: number;
  event: string;
  actor?: string;
  workflowName: string;
}

const config: Config = {
  githubToken: process.env.GITHUB_TOKEN,
  owner: process.env.GITHUB_OWNER || "play14team",
  repo: process.env.GITHUB_REPO || "play14-web",
  workflowId: process.env.GITHUB_WORKFLOW_ID || "217740349",
};

const mapRun = (run: WorkflowRun): MappedRun => ({
  id: run.id,
  status: run.status, // queued, in_progress, completed
  conclusion: run.conclusion, // success, failure, cancelled, skipped, etc.
  createdAt: run.created_at,
  updatedAt: run.updated_at,
  htmlUrl: run.html_url,
  runNumber: run.run_number,
  event: run.event,
  actor: run.actor?.login,
  workflowName: run.name,
});

export default {
  async trigger(ctx: any) {
    try {
      const githubService = strapi.service(
        "api::github-trigger.github-trigger",
      );

      if (!githubService) {
        ctx.throw(500, "GitHub trigger service not available");
        return;
      }

      const success = await githubService.triggerWorkflow(
        "Manual trigger from admin panel",
      );

      if (success) {
        ctx.body = {
          success: true,
          message: "Website rebuild triggered successfully",
        };
      } else {
        ctx.throw(
          500,
          "Failed to trigger rebuild. Check server logs for details.",
        );
      }
    } catch (error: any) {
      strapi.log.error("Rebuild trigger error:", error);
      ctx.throw(500, error.message || "Failed to trigger rebuild");
    }
  },

  async status(ctx: any) {
    try {
      if (!config.githubToken) {
        ctx.throw(500, "GitHub token not configured");
        return;
      }

      // Fetch workflow runs filtered by specific workflow ID
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${config.workflowId}/runs?per_page=20`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `token ${config.githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        strapi.log.error("GitHub API error:", errorText);
        ctx.throw(response.status, "Failed to fetch workflow status");
        return;
      }

      const data = await response.json();
      const runs: WorkflowRun[] = data.workflow_runs || [];

      // Find the latest run (first in list)
      const latestRun = runs[0] ? mapRun(runs[0]) : null;

      // Find the latest successful run
      const successfulRun = runs.find(
        (run) => run.status === "completed" && run.conclusion === "success",
      );
      const latestSuccessfulRun = successfulRun ? mapRun(successfulRun) : null;

      ctx.body = {
        success: true,
        latestRun,
        latestSuccessfulRun,
      };
    } catch (error: any) {
      strapi.log.error("Workflow status error:", error);
      ctx.throw(500, error.message || "Failed to fetch workflow status");
    }
  },

  async cancel(ctx: any) {
    try {
      if (!config.githubToken) {
        ctx.throw(500, "GitHub token not configured");
        return;
      }

      const { runId } = ctx.request.body;

      if (!runId) {
        ctx.throw(400, "Run ID is required");
        return;
      }

      // Cancel the workflow run
      const response = await fetch(
        `https://api.github.com/repos/${config.owner}/${config.repo}/actions/runs/${runId}/cancel`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `token ${config.githubToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      if (response.ok || response.status === 202) {
        ctx.body = {
          success: true,
          message: "Workflow run cancelled successfully",
        };
      } else {
        const errorText = await response.text();
        strapi.log.error("GitHub API cancel error:", errorText);
        ctx.throw(response.status, "Failed to cancel workflow run");
      }
    } catch (error: any) {
      strapi.log.error("Workflow cancel error:", error);
      ctx.throw(500, error.message || "Failed to cancel workflow run");
    }
  },
};
