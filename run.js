// run.js
const { getJob, getAllJobs } = require("./jobs");
const { putJson } = require("./lib/spaces");

function buildEnvelope(contents) {
  const { HEADER_AUTHOR, HEADER_DISCLOSURE, HEADER_LICENSE_URL } = process.env;

  if (!HEADER_AUTHOR || !HEADER_DISCLOSURE || !HEADER_LICENSE_URL) {
    throw new Error(
      "Missing required header env vars: HEADER_AUTHOR, HEADER_DISCLOSURE, HEADER_LICENSE_URL",
    );
  }

  return {
    header: {
      author: HEADER_AUTHOR,
      disclosure: HEADER_DISCLOSURE,
      license_url: HEADER_LICENSE_URL,
      generated_at: new Date().toISOString(),
    },
    contents,
  };
}

async function runJob(job) {
  const bucket = process.env[job.output.bucketEnv];
  if (!bucket) throw new Error(`Missing env var ${job.output.bucketEnv}`);

  console.log(`[${job.name}] start`);

  // Each job returns the *contents* payload only
  const contents = await job.run();

  // Wrap universally
  const json = buildEnvelope(contents);

  const result = await putJson({
    bucket,
    key: job.output.key,
    json,
    cacheControl: job.output.cacheControl,
  });

  console.log(`[${job.name}] uploaded s3://${result.bucket}/${result.key} (${result.bytes} bytes)`);
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
