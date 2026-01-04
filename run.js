const { getJob } = require("./jobs");
const { putJson } = require("./lib/spaces");

async function main() {
  const jobName = process.argv[2];
  if (!jobName) throw new Error("Usage: node run.js <jobName>");

  console.log("ENV CHECK:", {
    DB_HOST: !!process.env.DB_HOST,
    DB_PORT: !!process.env.DB_PORT,
    DB_USER: !!process.env.DB_USER,
    DB_PASSWORD: !!process.env.DB_PASSWORD,
    DB_NAME: !!process.env.DB_NAME,
    DB_CA_CERT: !!process.env.DB_CA_CERT,
    SPACES_BUCKET: !!process.env.SPACES_BUCKET,
    SPACES_REGION: !!process.env.SPACES_REGION,
    SPACES_KEY: !!process.env.SPACES_KEY,
    SPACES_SECRET: !!process.env.SPACES_SECRET,
});
  
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