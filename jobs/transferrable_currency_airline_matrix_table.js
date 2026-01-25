const { runTablePipeline } = require("../lib/table_pipeline");

const SOURCE_PROGRAMS = [
  { id: 63, name: "Membership Rewards" },
  { id: 62, name: "Bilt Points" },
  { id: 61, name: "Capital One Miles" },
  { id: 60, name: "Ultimate Rewards" },
  { id: 59, name: "ThankYou Rewards" },
  { id: 58, name: "Rove" },
  { id: 51, name: "Bonvoy" },
  { id: 57, name: "Wells Fargo Rewards" },
];

const TABLE_SETTINGS = {
  sortableColumns: true,
  density: "compact",
};

const job = {
  name: "transferrable_currency_airline_matrix_table",
  includeInAll: true,
  output: {
    space: "public",
    jsonKey: "transferrable_currency_airline_matrix.json",
    htmlKey: "transferrable_currency_airline_matrix.html",
    cacheControl: "public, max-age=300",
    skipUpload: true,
  },
  ghost: {
    type: "page",
    slug: "smoke-test",
    tableId: "transferrable_currency_airline_matrix_table",
  },
  table: {
    caption: "Table last updated on {{generated_at}}",
    settings: TABLE_SETTINGS,
  },
  fetchData: async (pool) => {
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
      throw new Error(
        `Missing LoyaltyProgram short_name for IDs: ${missingSourceNames
          .map((program) => program.id)
          .join(", ")}`,
      );
    }

    const sources = SOURCE_PROGRAMS.map((program) => ({
      id: program.id,
      name: sourceNameById.get(program.id) || program.name,
    })).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" }),
    );

    const [transferRows] = await pool.query(
      `
        SELECT
          ctp.from_loyalty_program_id AS from_id,
          ctp.to_loyalty_program_id AS to_id,
          lp_to.short_name AS to_name,
          COALESCE(a.short_name, a.full_name) AS company_name,
          ctp.base_numerator,
          ctp.base_denominator,
          ctp.base_decimal_expression AS decimal_expression,
          ctp.transfer_speed_display,
          ctp.transfer_speed_hours
        FROM CurrencyTransferPartner ctp
        JOIN LoyaltyProgram lp_from
          ON ctp.from_loyalty_program_id = lp_from.id
        JOIN LoyaltyProgram lp_to
          ON ctp.to_loyalty_program_id = lp_to.id
        LEFT JOIN Airline a
          ON a.loyalty_program_id = lp_to.id
        WHERE ctp.from_loyalty_program_id IN (?)
          AND ctp.is_active = 1
          AND lp_from.is_active = 1
          AND lp_to.is_active = 1
          AND lp_to.type = 'Airline'
      `,
      [sourceIds],
    );

    return { sources, transferRows };
  },
  buildTable: ({ sources, transferRows }) => {
    const columns = [
      {
        key: "program",
        label: "Program",
        sort: { enabled: false },
      },
      ...sources.map((source) => ({
        key: normalizeKey(source.name),
        label: source.name,
        sort: { enabled: true },
      })),
    ];

    const rowMap = new Map();
    const cellMap = new Map();

    transferRows.forEach((row) => {
      if (!rowMap.has(row.to_id)) {
        rowMap.set(row.to_id, {
          id: row.to_id,
          companyName: row.company_name || row.to_name,
          loyaltyName: row.to_name,
        });
      }

      cellMap.set(`${row.from_id}:${row.to_id}`, {
        rate: `${String(row.base_numerator)}:${String(row.base_denominator)}`,
        speed: row.transfer_speed_display || "",
        decimalExpression: row.decimal_expression,
        speedHours: row.transfer_speed_hours,
      });
    });

    const rows = Array.from(rowMap.values())
      .sort((a, b) =>
        (a.companyName || "").localeCompare(b.companyName || "", "en", {
          sensitivity: "base",
        }),
      )
      .map((row) => {
        const label = [
          `<strong>${escapeHtml(row.companyName)}</strong>`,
          escapeHtml(row.loyaltyName),
        ].join("<br>");

        const cells = sources.map((source) => {
          const transfer = cellMap.get(`${source.id}:${row.id}`);
          if (!transfer) {
            return { value: "", sort: { primary: "" } };
          }

          const value = transfer.speed
            ? `${escapeHtml(transfer.rate)}<br>${escapeHtml(transfer.speed)}`
            : escapeHtml(transfer.rate);

          const primary = parseSortNumber(transfer.decimalExpression);
          const secondary =
            transfer.speedHours == null ? null : Number(transfer.speedHours);

          return {
            value,
            sort: {
              primary: primary == null ? "" : primary,
              secondary,
            },
          };
        });

        return { label, cells };
      });

    return {
      ...job.table,
      columns,
      rows,
    };
  },
  run: async () => runTablePipeline(job),
};

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSortNumber(value) {
  if (value == null || value === "") return null;
  const numberValue = Number(value);
  if (Number.isFinite(numberValue)) return numberValue;
  return String(value);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = job;
