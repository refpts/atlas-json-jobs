const { getDbPool } = require("./db");
const { buildEnvelope, buildHeader } = require("./envelope");
const { putJson, putHtml } = require("./spaces");
const { generateTableHtml } = require("./table_generator");
const { updateTableBySlug } = require("./ghost");

async function runTablePipeline(job) {
  if (!job || typeof job !== "object") {
    throw new Error("Job config is required for table pipeline.");
  }

  const output = job.output || {};
  const space = output.space || job.space || "public";
  const cacheControl = output.cacheControl || "public, max-age=300";
  const jsonKey = output.jsonKey;
  const htmlKey = output.htmlKey;
  const bucketOverride = output.bucketEnv
    ? process.env[output.bucketEnv]
    : undefined;

  if (output.bucketEnv && !bucketOverride) {
    throw new Error(`Missing env var ${output.bucketEnv}`);
  }

  if (!jsonKey || !htmlKey) {
    throw new Error("Table pipeline requires output.jsonKey and output.htmlKey.");
  }

  const pool = getDbPool();
  let data;

  try {
    if (typeof job.fetchData === "function") {
      data = await job.fetchData(pool);
    } else if (job.query) {
      const [rows] = await pool.query(job.query, job.queryParams || []);
      data = rows;
    } else {
      throw new Error("Table pipeline requires fetchData() or query.");
    }
  } finally {
    await pool.end();
  }

  const header = buildHeader();
  const tableId =
    (job.ghost && job.ghost.tableId) ||
    (job.table && job.table.id) ||
    job.name;

  const tableSpec = await buildTableSpec(job, data, {
    header,
    tableId,
  });

  const contents = { table: tableSpec };
  const envelope = buildEnvelope(contents, header);

  await putJson({
    space,
    bucket: bucketOverride,
    key: jsonKey,
    json: envelope,
    cacheControl,
  });

  const html = generateTableHtml(contents);

  await putHtml({
    space,
    bucket: bucketOverride,
    key: htmlKey,
    html,
    cacheControl,
  });

  if (job.ghost) {
    await updateTableBySlug({
      type: job.ghost.type,
      slug: job.ghost.slug,
      tableId: tableSpec.id,
      newTableHtml: html,
    });
  }

  return { envelope, html };
}

async function buildTableSpec(job, data, context) {
  let tableSpec;

  if (typeof job.buildTable === "function") {
    tableSpec = await job.buildTable(data, context);
  } else if (job.table && typeof job.buildRows === "function") {
    tableSpec = {
      ...job.table,
      rows: job.buildRows(data, context),
    };
  } else {
    throw new Error(
      "Table pipeline requires buildTable() or table + buildRows().",
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

module.exports = { runTablePipeline };
