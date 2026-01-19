const { getDbPool } = require("../lib/db");

const COLUMNS = [
  { key: "source_currency", name: "Source Currency" },
  { key: "destination_currency", name: "Destination Currency" },
  { key: "conversion_rate", name: "Conversion Rate" },
  { key: "transfer_speed", name: "Transfer Speed" },
  { key: "availability", name: "Availability" },
  { key: "min_transfer_qty", name: "Minimum Transfer Quantity" },
  { key: "max_transfer_qty", name: "Maximum Transfer Quantity" },
  { key: "min_transfer_unit", name: "Minimum Transfer Unit" },
  { key: "transfer_bonus", name: "Transfer Bonus" },
  { key: "notes", name: "Notes" },
];

const UNIT_LABELS = {
  Point: { singular: "point", plural: "points" },
  Mile: { singular: "mile", plural: "miles" },
  Cash: { singular: "cash", plural: "cash" },
};

function parseNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numberValue = Number(trimmed);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
  return null;
}

function formatNumber(value) {
  if (value == null) return "";
  const numberValue = parseNumber(value);
  return numberValue == null ? String(value) : numberValue.toLocaleString("en-US");
}

function getUnitLabel(unitType, amount) {
  const labels =
    UNIT_LABELS[unitType] || {
      singular: unitType ? unitType.toLowerCase() : "unit",
      plural: unitType ? `${unitType.toLowerCase()}s` : "units",
    };
  const usePlural = typeof amount === "number" ? amount > 1 : true;
  return usePlural ? labels.plural : labels.singular;
}

function makeCell(display, sortValue) {
  const displayValue = display == null ? "" : display;
  const sort = sortValue == null || sortValue === "" ? "" : sortValue;
  return { display: displayValue, sort };
}

function formatQuantityCell(value, unitType) {
  if (value == null || value === "") return makeCell("", "");
  const numberValue = parseNumber(value);
  const formattedNumber = numberValue == null ? String(value) : formatNumber(value);
  const unitLabel = getUnitLabel(unitType, numberValue);
  return makeCell(
    `${formattedNumber} ${unitLabel}`,
    numberValue == null ? value : numberValue,
  );
}

function formatTransferBonusCell({
  bonusAmount,
  bonusUnit,
  destinationUnitType,
  originUnitType,
}) {
  if (
    bonusAmount == null ||
    bonusAmount === "" ||
    bonusUnit == null ||
    bonusUnit === ""
  ) {
    return makeCell("", "");
  }

  const amountNumber = parseNumber(bonusAmount);
  const unitNumber = parseNumber(bonusUnit);
  const amountDisplay = formatNumber(bonusAmount);
  const unitDisplay = formatNumber(bonusUnit);

  const destinationUnitLabel = getUnitLabel(
    destinationUnitType,
    amountNumber ?? 2,
  );
  const originUnitLabel = getUnitLabel(originUnitType, unitNumber ?? 2);

  const display = `${amountDisplay} bonus ${destinationUnitLabel} for each transfer of ${unitDisplay} ${originUnitLabel}`;
  return makeCell(display, amountNumber == null ? bonusAmount : amountNumber);
}

module.exports = {
  name: "currency_conversions",
  output: {
    space: "public",
    key: "currency_conversions.json",
    cacheControl: "public, max-age=300",
  },

  run: async () => {
    const pool = getDbPool();

    const [rows] = await pool.query(
      `
        SELECT
          COALESCE(lp_from.short_name, lp_from.full_name) AS from_name,
          COALESCE(lp_to.short_name, lp_to.full_name) AS to_name,
          ctp.base_numerator,
          ctp.base_denominator,
          ctp.base_decimal_expression,
          ctp.transfer_speed_display,
          ctp.transfer_speed_hours,
          ctp.availability,
          ctp.transfer_min_qty,
          ctp.transfer_max_qty,
          ctp.transfer_unit,
          ctp.transfer_bonus_amount,
          ctp.transfer_bonus_unit,
          ctp.notes,
          c_from.unit_type AS from_unit_type,
          c_to.unit_type AS to_unit_type
        FROM CurrencyTransferPartner ctp
        JOIN LoyaltyProgram lp_from
          ON ctp.from_loyalty_program_id = lp_from.id
        JOIN LoyaltyProgram lp_to
          ON ctp.to_loyalty_program_id = lp_to.id
        LEFT JOIN Currency c_from
          ON lp_from.currency_id = c_from.id
        LEFT JOIN Currency c_to
          ON lp_to.currency_id = c_to.id
        WHERE ctp.is_active = 1
          AND lp_from.is_active = 1
          AND lp_to.is_active = 1
        ORDER BY from_name ASC, to_name ASC
      `,
    );

    await pool.end();

    const dataRows = rows.map((row) => {
      const conversionDisplay =
        row.base_numerator == null || row.base_denominator == null
          ? ""
          : `${String(row.base_numerator)}:${String(row.base_denominator)}`;
      const conversionSort = parseNumber(row.base_decimal_expression);

      return {
        source_currency: makeCell(row.from_name || "", row.from_name || ""),
        destination_currency: makeCell(row.to_name || "", row.to_name || ""),
        conversion_rate: makeCell(conversionDisplay, conversionSort),
        transfer_speed: makeCell(
          row.transfer_speed_display || "",
          row.transfer_speed_hours == null ? "" : row.transfer_speed_hours,
        ),
        availability: makeCell(row.availability || "", row.availability || ""),
        min_transfer_qty: formatQuantityCell(
          row.transfer_min_qty,
          row.from_unit_type,
        ),
        max_transfer_qty: formatQuantityCell(
          row.transfer_max_qty,
          row.from_unit_type,
        ),
        min_transfer_unit: formatQuantityCell(
          row.transfer_unit,
          row.from_unit_type,
        ),
        transfer_bonus: formatTransferBonusCell({
          bonusAmount: row.transfer_bonus_amount,
          bonusUnit: row.transfer_bonus_unit,
          destinationUnitType: row.to_unit_type,
          originUnitType: row.from_unit_type,
        }),
        notes: makeCell(row.notes || "", row.notes || ""),
      };
    });

    return {
      columns: COLUMNS,
      rows: dataRows,
    };
  },
};
