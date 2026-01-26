const transferrable_currency_airline_matrix_table = require("./transferrable_currency_airline_matrix_table");
const currency_conversions = require("./currency_conversions");

const JOBS = {
  [transferrable_currency_airline_matrix_table.name]:
    transferrable_currency_airline_matrix_table,
  [currency_conversions.name]: currency_conversions,
};

function getJob(name) {
  const job = JOBS[name];
  if (!job) throw new Error(`Unknown job "${name}". Available: ${Object.keys(JOBS).join(", ")}`);
  return job;
}

function getAllJobs() {
  return Object.values(JOBS).filter((job) => job.includeInAll !== false);
}

module.exports = { getJob, getAllJobs };
