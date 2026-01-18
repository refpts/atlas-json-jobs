const cards_hourly = require("./cards_hourly");
const transferrable_currency_airline_matrix = require("./transferrable_currency_airline_matrix");
const transferrable_currency_hotel_matrix = require("./transferrable_currency_hotel_matrix");
const transferrable_currency_requirements = require("./transferrable_currency_requirements");

const JOBS = {
  [cards_hourly.name]: cards_hourly,
  [transferrable_currency_airline_matrix.name]:
    transferrable_currency_airline_matrix,
  [transferrable_currency_hotel_matrix.name]:
    transferrable_currency_hotel_matrix,
  [transferrable_currency_requirements.name]:
    transferrable_currency_requirements,
};

function getJob(name) {
  const job = JOBS[name];
  if (!job) throw new Error(`Unknown job "${name}". Available: ${Object.keys(JOBS).join(", ")}`);
  return job;
}

module.exports = { getJob };
