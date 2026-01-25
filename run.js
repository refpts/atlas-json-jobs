// run.js
const { getJob, getAllJobs } = require("./jobs");
const { putJson } = require("./lib/spaces");
const { buildEnvelope } = require("./lib/envelope");

async function runJob(job) {
  if (!job || typeof job !== "object") {
    throw new Error("Job config is required.");
  }
  if (typeof job.run !== "function") {
    throw new Error(`Job "${job.name || "unknown"}" is missing a run() method.`);
  }

  if (job.output && job.output.skipUpload) {
    // New pipeline jobs handle their own uploads.
    await job.run();
    return;
  }

  if (!job.output) {
    throw new Error(`Job "${job.name || "unknown"}" is missing output config.`);
  }
  if (!job.output.key) {
    throw new Error(`Job "${job.name || "unknown"}" is missing output.key.`);
  }

  const space = job.output.space || "public";
  const bucketOverride = job.output.bucketEnv
    ? process.env[job.output.bucketEnv]
    : undefined;

  if (job.output.bucketEnv && !bucketOverride) {
    throw new Error(`Missing env var ${job.output.bucketEnv}`);
  }

  console.log(`[${job.name}] start`);

  // Each job returns the *contents* payload only
  const contents = await job.run();

  // Wrap universally
  const json = buildEnvelope(contents);

  const result = await putJson({
    space,
    bucket: bucketOverride,
    key: job.output.key,
    json,
    cacheControl: job.output.cacheControl,
  });

  console.log(
    `[${job.name}] uploaded s3://${result.bucket}/${result.key} (${result.bytes} bytes)`,
  );
}

async function main() {
  const jobName = process.argv[2];
  if (!jobName) throw new Error("Usage: node run.js <jobName|all>");

  if (jobName === "all") {
    const jobs = getAllJobs();
    for (const job of jobs) {
      await runJob(job);
    }
    return;
  }

  const job = getJob(jobName);
  await runJob(job);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
