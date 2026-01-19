// jobs/cards_hourly.js
const { getDbPool } = require("../lib/db");

module.exports = {
  name: "cards_hourly",
  output: {
    space: "public",
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

    // This becomes json.contents
    return {
      count: rows.length,
      data: rows,
    };
  },
};
