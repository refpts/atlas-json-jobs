const { getDbPool } = require("../lib/db");

const SOURCE_PROGRAMS = [
  { id: 63, name: "Membership Rewards" },
  { id: 62, name: "Bilt Points" },
  { id: 61, name: "Capital One Miles" },
  { id: 60, name: "Ultimate Rewards" },
  { id: 59, name: "ThankYou Rewards" },
  { id: 57, name: "Wells Fargo Rewards" },
];

module.exports = {
  name: "transferrable_currency_hotel_matrix",
  output: {
    bucketEnv: "SPACES_BUCKET",
    key: "transferrable_currency_hotel_matrix.json",
    cacheControl: "public, max-age=300",
  },

  run: async () => {
    const pool = getDbPool();
    const sourceIds = SOURCE_PROGRAMS.map((program) => program.id);

    const [sourceRows] = await pool.query(
      `
        SELECT id, short_name
        FROM LoyaltyProgram
        WHERE id IN (?)
      `,
      [sourceIds],
    );

    const sourceNameById = new Map(
      sourceRows.map((row) => [row.id, row.short_name]),
    );

    const missingSourceNames = SOURCE_PROGRAMS.filter(
      (program) => !sourceNameById.has(program.id),
    );
    if (missingSourceNames.length > 0) {
      await pool.end();
      throw new Error(
        `Missing LoyaltyProgram short_name for IDs: ${missingSourceNames
          .map((program) => program.id)
          .join(", ")}`,
      );
    }

    const columns = SOURCE_PROGRAMS.map((program) => ({
      id: program.id,
      name: sourceNameById.get(program.id) || program.name,
    }));

    const [transferRows] = await pool.query(
      `
        SELECT
          ctp.from_loyalty_program_id AS from_id,
          ctp.to_loyalty_program_id AS to_id,
          lp_to.short_name AS to_name,
          ctp.base_numerator,
          ctp.base_denominator,
          ctp.transfer_speed_display
        FROM CurrencyTransferPartner ctp
        JOIN LoyaltyProgram lp_from
          ON ctp.from_loyalty_program_id = lp_from.id
        JOIN LoyaltyProgram lp_to
          ON ctp.to_loyalty_program_id = lp_to.id
        WHERE ctp.from_loyalty_program_id IN (?)
          AND ctp.is_active = 1
          AND lp_from.is_active = 1
          AND lp_to.is_active = 1
          AND lp_to.type = 'Hotel'
      `,
      [sourceIds],
    );

    await pool.end();

    const rowMap = new Map();
    const cellMap = new Map();

    for (const row of transferRows) {
      if (!rowMap.has(row.to_id)) {
        rowMap.set(row.to_id, { id: row.to_id, name: row.to_name });
      }

      const rate = `${String(row.base_numerator)}:${String(
        row.base_denominator,
      )}`;
      const speed = row.transfer_speed_display || "";
      cellMap.set(`${row.from_id}:${row.to_id}`, { rate, speed });
    }

    const rows = Array.from(rowMap.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );

    const matrix = rows.map((row) =>
      columns.map((column) => cellMap.get(`${column.id}:${row.id}`) || ""),
    );

    return {
      columns: columns.map((column) => ({ name: column.name })),
      rows: rows.map((row) => ({ name: row.name })),
      matrix,
    };
  },
};
