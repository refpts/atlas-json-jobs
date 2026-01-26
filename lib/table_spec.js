async function buildTableSpec(job, data, context) {
  let tableSpec;

  if (typeof job.buildTable === "function") {
    tableSpec = await job.buildTable(data, context);
  } else if (job.table && typeof job.buildRows === "function") {
    tableSpec = {
      ...job.table,
      rows: await job.buildRows(data, context),
    };
  } else {
    throw new Error(
      "Table builder requires buildTable() or table + buildRows().",
    );
  }

  if (!tableSpec || !Array.isArray(tableSpec.columns)) {
    throw new Error("Table spec must include a columns array.");
  }
  if (!Array.isArray(tableSpec.rows)) {
    throw new Error("Table spec must include a rows array.");
  }

  if (!tableSpec.id) {
    tableSpec.id = context.tableId;
  }

  const figcaption = resolveCaption(
    tableSpec.figcaption || tableSpec.caption,
    context.header,
  );
  tableSpec.figcaption =
    figcaption || `Last updated ${context.header.published} ET`;
  delete tableSpec.caption;

  return tableSpec;
}

function resolveCaption(template, header) {
  if (typeof template === "function") {
    return template({ header });
  }
  if (typeof template !== "string") return template;

  return template
    .replace(/\{\{\s*generated_at\s*\}\}/g, header.generated_at)
    .replace(/\{\{\s*published\s*\}\}/g, header.published);
}

module.exports = { buildTableSpec };
