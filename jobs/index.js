const cards_hourly = require("./cards_hourly");

const JOBS = {
  [cards_hourly.name]: cards_hourly,
};

function getJob(name) {
  const job = JOBS[name];
  if (!job) throw new Error(`Unknown job "${name}". Available: ${Object.keys(JOBS).join(", ")}`);
  return job;
}

module.exports = { getJob };