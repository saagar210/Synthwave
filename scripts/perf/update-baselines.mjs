import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const files = [
  [".perf-results/bundle.json", ".perf-baselines/bundle.json"],
  [".perf-results/build-time.json", ".perf-baselines/build-time.json"],
];

mkdirSync(".perf-baselines", { recursive: true });

for (const [source, destination] of files) {
  if (!existsSync(source)) {
    console.error(`Missing ${source}. Run the perf capture commands first.`);
    process.exit(1);
  }

  copyFileSync(source, destination);
  console.log(`updated ${destination}`);
}
