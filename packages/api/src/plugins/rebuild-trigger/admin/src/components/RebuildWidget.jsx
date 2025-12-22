import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Flex, Typography, Box, Loader, Badge } from "@strapi/design-system";
import { useFetchClient, useNotification } from "@strapi/strapi/admin";
import { Check, Cross, Play, ExternalLink, ArrowClockwise, Trash } from "@strapi/icons";

const PLUGIN_ID = "rebuild-trigger";
const POLL_INTERVAL = 10000; // Poll every 10 seconds when a build is in progress

const getStatusBadge = (status, conclusion) => {
  if (status === "in_progress" || status === "queued") {
    return (
      <Badge backgroundColor="warning500" textColor="neutral0">
        <Flex gap={1} alignItems="center">
          <Loader small />
          {status === "queued" ? "Queued" : "Building..."}
        </Flex>
      </Badge>
    );
  }

  if (status === "completed") {
    if (conclusion === "success") {
      return (
        <Badge backgroundColor="success500" textColor="neutral0">
          <Flex gap={1} alignItems="center">
            <Check width="12px" height="12px" />
            Success
          </Flex>
        </Badge>
      );
    }
    if (conclusion === "failure") {
      return (
        <Badge backgroundColor="danger500" textColor="neutral0">
          <Flex gap={1} alignItems="center">
            <Cross width="12px" height="12px" />
            Failed
          </Flex>
        </Badge>
      );
    }
    if (conclusion === "cancelled") {
      return (
        <Badge backgroundColor="neutral500" textColor="neutral0">
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge backgroundColor="neutral500" textColor="neutral0">
        {conclusion || "Unknown"}
      </Badge>
    );
  }

  return null;
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString();
};

const RunInfo = ({ run, label }) => {
  if (!run) return null;

  return (
    <Box
      padding={3}
      background="neutral100"
      borderColor="neutral200"
      hasRadius
    >
      <Flex direction="column" gap={2}>
        <Typography variant="sigma" textColor="neutral600">
          {label}
        </Typography>
        <Flex direction="column" gap={2}>
          {run.workflowName && (
            <Typography variant="omega" fontWeight="bold">
              {run.workflowName}
            </Typography>
          )}
          <Box>{getStatusBadge(run.status, run.conclusion)}</Box>

          <Typography variant="pi" textColor="neutral500">
            {formatTime(run.updatedAt || run.createdAt)}
          </Typography>

          {run.actor && (
            <Typography variant="pi" textColor="neutral500">
              by {run.actor}
            </Typography>
          )}

          {run.htmlUrl && (
            <a
              href={run.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                color: "#4945ff",
                textDecoration: "none",
                fontSize: "12px"
              }}
            >
              View on GitHub <ExternalLink width="12px" height="12px" />
            </a>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

const RebuildWidget = () => {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [latestSuccessfulRun, setLatestSuccessfulRun] = useState(null);
  const [currentRun, setCurrentRun] = useState(null); // Track triggered/in-progress run
  const [isPolling, setIsPolling] = useState(false);
  const triggeredRunId = useRef(null); // Track the run we triggered

  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  const fetchStatus = useCallback(async () => {
    try {
      const response = await get(`/${PLUGIN_ID}/status`);
      const { latestRun, latestSuccessfulRun: successfulRun } = response.data || {};

      setLatestSuccessfulRun(successfulRun);

      // If we're tracking a triggered run, update current run status
      if (triggeredRunId.current && latestRun) {
        // Check if the latest run is the one we triggered or newer
        if (latestRun.id >= triggeredRunId.current) {
          setCurrentRun(latestRun);

          // Stop polling if the run completed
          if (latestRun.status === "completed") {
            setIsPolling(false);
            // If successful, clear current run (it will show as latest successful)
            if (latestRun.conclusion === "success") {
              setCurrentRun(null);
              triggeredRunId.current = null;
            }
          }
        }
      } else if (latestRun && (latestRun.status === "in_progress" || latestRun.status === "queued")) {
        // Show in-progress runs even if we didn't trigger them
        setCurrentRun(latestRun);
        setIsPolling(true);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setStatusLoading(false);
    }
  }, [get]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Polling when build is in progress
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(fetchStatus, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isPolling, fetchStatus]);

  const handleRebuild = async () => {
    setLoading(true);
    try {
      const response = await post(`/${PLUGIN_ID}/trigger`);

      toggleNotification({
        type: "success",
        message: response.data?.message || "Website rebuild triggered!",
      });

      // Clear any previous failed run
      setCurrentRun(null);

      // Start polling for the new run
      setIsPolling(true);

      // Fetch status after a short delay to get the new run
      setTimeout(async () => {
        const statusResponse = await get(`/${PLUGIN_ID}/status`);
        const { latestRun } = statusResponse.data || {};
        if (latestRun) {
          triggeredRunId.current = latestRun.id;
          setCurrentRun(latestRun);
        }
      }, 3000);
    } catch (error) {
      toggleNotification({
        type: "warning",
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to trigger rebuild",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    // Clear failed run state and trigger new build
    setCurrentRun(null);
    triggeredRunId.current = null;
    handleRebuild();
  };

  const handleCancel = async () => {
    if (!currentRun || !currentRun.id) return;

    setCancelling(true);
    try {
      const response = await post(`/${PLUGIN_ID}/cancel`, {
        runId: currentRun.id,
      });

      toggleNotification({
        type: "success",
        message: response.data?.message || "Workflow run cancelled successfully",
      });

      // Fetch updated status immediately
      await fetchStatus();
    } catch (error) {
      toggleNotification({
        type: "warning",
        message:
          error.response?.data?.error?.message ||
          error.message ||
          "Failed to cancel workflow run",
      });
    } finally {
      setCancelling(false);
    }
  };

  const isBuilding = currentRun && (currentRun.status === "in_progress" || currentRun.status === "queued");
  const hasFailed = currentRun && currentRun.status === "completed" && currentRun.conclusion === "failure";

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="omega" textColor="neutral600">
        Trigger a rebuild of the play14 website to publish recent content changes.
      </Typography>

      <Flex gap={2} justifyContent="center">
        <Button
          onClick={handleRebuild}
          loading={loading}
          disabled={isBuilding || cancelling}
          startIcon={<Play />}
          style={{ maxWidth: "200px" }}
        >
          {loading ? "Triggering..." : isBuilding ? "Build in progress..." : "Rebuild Now"}
        </Button>

        {isBuilding && (
          <Button
            onClick={handleCancel}
            loading={cancelling}
            disabled={cancelling}
            variant="danger-light"
            startIcon={<Trash />}
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </Button>
        )}

        {hasFailed && (
          <Button
            onClick={handleRetry}
            variant="danger"
            startIcon={<ArrowClockwise />}
          >
            Retry
          </Button>
        )}
      </Flex>

      {/* Current/In-Progress Build Section */}
      {statusLoading ? (
        <Flex justifyContent="center" padding={4}>
          <Loader small />
        </Flex>
      ) : (
        <>
          {currentRun && (
            <RunInfo
              run={currentRun}
              label={isBuilding ? "CURRENT BUILD" : "LAST TRIGGERED BUILD"}
            />
          )}

          {/* Latest Successful Build Section */}
          {latestSuccessfulRun && (!currentRun || currentRun.id !== latestSuccessfulRun.id) && (
            <RunInfo run={latestSuccessfulRun} label="LATEST SUCCESSFUL BUILD" />
          )}

          {!currentRun && !latestSuccessfulRun && (
            <Box padding={3} background="neutral100" hasRadius>
              <Typography variant="omega" textColor="neutral500">
                No recent builds found
              </Typography>
            </Box>
          )}
        </>
      )}
    </Flex>
  );
};

export { RebuildWidget };
export default RebuildWidget;
