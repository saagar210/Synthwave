import { spawnSync } from "node:child_process";

const checks = [
  [
    ".perf-baselines/bundle.json",
    ".perf-results/bundle.json",
    "totalBytes",
    "0.08",
  ],
];

if (!process.env.GITHUB_ACTIONS) {
  checks.push([
    ".perf-baselines/build-time.json",
    ".perf-results/build-time.json",
    "buildMs",
    "0.25",
  ]);
}

for (const args of checks) {
  const result = spawnSync(
    "node",
    ["scripts/perf/compare-metric.mjs", ...args],
    {
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
