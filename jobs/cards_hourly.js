const { getDbPool } = require("../lib/db");
const { nowIso } = require("../lib/util");

module.exports = {
  name: "cards_hourly",
  output: {
    bucketEnv: "SPACES_BUCKET",
    key: "cards.json",
    cacheControl: "public, max-age=300",
  },

  run: async () => {
    const pool = getDbPool();

    const sql = `
      SELECT
        c.proper_name,
        c.demographic,
        c.type,
        c.annual_fee,
        p.processor_name AS processor
      FROM Card c
      JOIN Processor p ON c.processor_id = p.id
      ORDER BY c.id ASC
      LIMIT 10;
    `;

    const [rows] = await pool.query(sql);
    await pool.end();

    return {
      generated_at: nowIso(),
      count: rows.length,
      data: rows,
    };
  },
};