const { getDbPool } = require("../lib/db");

const SOURCE_PROGRAMS = [
  { id: 63, name: "Membership Rewards" },
  { id: 62, name: "Bilt Points" },
  { id: 61, name: "Capital One Miles" },
  { id: 60, name: "Ultimate Rewards" },
  { id: 59, name: "ThankYou Rewards" },
  { id: 51, name: "Bonvoy" },
  { id: 57, name: "Wells Fargo Rewards" },
];

const ROWS = [
  { id: "min_transfer_qty", name: "Minimum transfer quantity" },
  { id: "max_transfer_qty", name: "Maximum transfer quantity" },
  { id: "min_transfer_unit", name: "Minimum transfer unit" },
  { id: "airline_partner_count", name: "Airline transfer partners" },
  { id: "hotel_partner_count", name: "Hotel transfer partners" },
];

module.exports = {
  name: "transferrable_currency_requirements",
  output: {
    bucketEnv: "SPACES_BUCKET",
    key: "transferrable_currency_requirements.json",
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

    const [requirementRows] = await pool.query(
      `
        SELECT
          lp.id AS from_id,
          MIN(CASE WHEN lp_to.id IS NOT NULL THEN ctp.transfer_min_qty END) AS min_transfer_qty,
          MAX(CASE WHEN lp_to.id IS NOT NULL THEN ctp.transfer_max_qty END) AS max_transfer_qty,
          MIN(CASE WHEN lp_to.id IS NOT NULL THEN ctp.transfer_unit END) AS min_transfer_unit,
          COUNT(DISTINCT CASE WHEN lp_to.type = 'Airline' THEN lp_to.id END) AS airline_partner_count,
          COUNT(DISTINCT CASE WHEN lp_to.type = 'Hotel' THEN lp_to.id END) AS hotel_partner_count
        FROM LoyaltyProgram lp
        LEFT JOIN CurrencyTransferPartner ctp
          ON ctp.from_loyalty_program_id = lp.id
          AND ctp.is_active = 1
        LEFT JOIN LoyaltyProgram lp_to
          ON ctp.to_loyalty_program_id = lp_to.id
          AND lp_to.is_active = 1
        WHERE lp.id IN (?)
          AND lp.is_active = 1
        GROUP BY lp.id
      `,
      [sourceIds],
    );

    await pool.end();

    const requirementBySourceId = new Map(
      requirementRows.map((row) => [row.from_id, row]),
    );

    const formatValue = (value) => {
      if (value == null) return "";
      if (typeof value === "number") return value.toLocaleString("en-US");
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return "";
        const numberValue = Number(trimmed);
        if (Number.isFinite(numberValue)) {
          return numberValue.toLocaleString("en-US");
        }
      }
      return value;
    };

    const matrix = ROWS.map((rowDef) =>
      columns.map((column) => {
        const row = requirementBySourceId.get(column.id);
        if (!row) return "";
        return formatValue(row[rowDef.id]);
      }),
    );

    return {
      columns: columns.map((column) => ({ name: column.name })),
      rows: ROWS.map((row) => ({ name: row.name })),
      matrix,
    };
  },
};
