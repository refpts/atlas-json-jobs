// run.js
const { getJob, getAllJobs } = require("./jobs");
async function runJob(job) {
  if (!job || typeof job !== "object") {
    throw new Error("Job config is required.");
  }
  if (typeof job.run !== "function") {
    throw new Error(`Job "${job.name || "unknown"}" is missing a run() method.`);
  }

  if (!job.output) {
    throw new Error(`Job "${job.name || "unknown"}" is missing output config.`);
  }
  if (job.output.skipUpload !== true) {
    throw new Error(
      `Job "${job.name || "unknown"}" must handle uploads (set output.skipUpload: true).`,
    );
  }

  console.log(`[${job.name}] start`);

  await job.run();
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
