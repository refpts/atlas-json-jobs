// run.js
const { getJob, getAllJobs } = require("./jobs");
const { putJson } = require("./lib/spaces");

function formatPublishedEastern(date) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} at ${timePart}`;
}

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
      published: formatPublishedEastern(new Date()),
      generated_at: new Date().toISOString(),
    },
    contents,
  };
}

async function runJob(job) {
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
