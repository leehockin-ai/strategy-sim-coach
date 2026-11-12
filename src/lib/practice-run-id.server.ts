const RUN_ID = "X-Lovable-AIG-Run-ID";
export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;
  return {
    getRunId: () => runId,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
      const response = await fetch(input, { ...init, headers });
      runId ??= response.headers.get(RUN_ID)?.trim() || undefined;
      return response;
    },
  };
}