const { getJob } = require("./jobs");
const { putJson } = require("./lib/spaces");

async function main() {
  const jobName = process.argv[2];
  if (!jobName) throw new Error("Usage: node run.js <jobName>");

  const job = getJob(jobName);
  const bucket = process.env[job.output.bucketEnv];
  if (!bucket) throw new Error(`Missing env var ${job.output.bucketEnv}`);

  console.log(`[${job.name}] start`);
  const json = await job.run();

  const result = await putJson({
    bucket,
    key: job.output.key,
    json,
    cacheControl: job.output.cacheControl,
  });

  console.log(`[${job.name}] uploaded s3://${result.bucket}/${result.key} (${result.bytes} bytes)`);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});