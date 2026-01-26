const { getDbPool } = require("./db");
const { buildEnvelope, buildHeader } = require("./envelope");
const { putJson, putHtml } = require("./spaces");
const { generateTableHtml } = require("./table_generator");
const { updateTablesBySlug } = require("./ghost");
const { buildTableSpec } = require("./table_pipeline");

async function runPagePipeline(job) {
  if (!job || typeof job !== "object") {
    throw new Error("Job config is required for page pipeline.");
  }

  if (!Array.isArray(job.tables) || job.tables.length === 0) {
    throw new Error("Page pipeline requires a non-empty tables array.");
  }

  const outputDefaults = job.output || {};
  const defaultSpace = outputDefaults.space || job.space || "public";
  const defaultCacheControl =
    outputDefaults.cacheControl || "public, max-age=300";
  const defaultBucketOverride = outputDefaults.bucketEnv
    ? process.env[outputDefaults.bucketEnv]
    : undefined;

  if (outputDefaults.bucketEnv && !defaultBucketOverride) {
    throw new Error(`Missing env var ${outputDefaults.bucketEnv}`);
  }

  const jobName = job.name || "job";
  const logStep = (message) => {
    console.log(`[${jobName}] ${message}`);
  };

  const pool = getDbPool();
  let data;
  let fetchError;

  logStep("fetching data");
  try {
    if (typeof job.fetchData === "function") {
      data = await job.fetchData(pool);
    } else if (job.query) {
      const [rows] = await pool.query(job.query, job.queryParams || []);
      data = rows;
    } else {
      throw new Error("Page pipeline requires fetchData() or query.");
    }
  } catch (error) {
    fetchError = error;
  } finally {
    try {
      await pool.end();
    } catch (endError) {
      if (fetchError) {
        fetchError.poolError = endError;
      } else {
        throw endError;
      }
    }
  }

  if (fetchError) {
    throw fetchError;
  }

  const header = buildHeader();
  const tableHtmlById = {};
  const results = [];

  for (const tableDef of job.tables) {
    if (!tableDef || typeof tableDef !== "object") {
      throw new Error("Table definition must be an object.");
    }

    const tableId =
      tableDef.id ||
      (tableDef.table && tableDef.table.id) ||
      tableDef.name;
    if (!tableId) {
      throw new Error("Table definition is missing an id.");
    }

    const output = tableDef.output || {};
    const jsonKey = output.jsonKey;
    const htmlKey = output.htmlKey;
    if (!jsonKey || !htmlKey) {
      throw new Error(`Table "${tableId}" requires output.jsonKey and output.htmlKey.`);
    }

    const space = output.space || defaultSpace;
    const cacheControl = output.cacheControl || defaultCacheControl;
    const bucketOverride = output.bucketEnv
      ? process.env[output.bucketEnv]
      : defaultBucketOverride;

    if (output.bucketEnv && !bucketOverride) {
      throw new Error(`Missing env var ${output.bucketEnv}`);
    }

    logStep(`building table ${tableId}`);
    const tableSpec = await buildTableSpec(
      {
        buildTable: tableDef.buildTable,
        buildRows: tableDef.buildRows,
        table: tableDef.table,
      },
      data,
      {
        header,
        tableId,
      },
    );

    const contents = { table: tableSpec };
    const envelope = buildEnvelope(contents, header);

    logStep(`publishing JSON for ${tableId} to ${jsonKey}`);
    await putJson({
      space,
      bucket: bucketOverride,
      key: jsonKey,
      json: envelope,
      cacheControl,
    });

    const html = generateTableHtml(contents);

    logStep(`publishing HTML for ${tableId} to ${htmlKey}`);
    await putHtml({
      space,
      bucket: bucketOverride,
      key: htmlKey,
      html,
      cacheControl,
    });

    if (tableHtmlById[tableSpec.id]) {
      throw new Error(`Duplicate table id "${tableSpec.id}" in page job.`);
    }
    tableHtmlById[tableSpec.id] = html;
    results.push({ id: tableSpec.id, envelope, html });
  }

  if (job.ghost) {
    logStep(
      `updating Ghost ${job.ghost.type}:${job.ghost.slug} (${Object.keys(tableHtmlById).length} tables)`,
    );
    await updateTablesBySlug({
      type: job.ghost.type,
      slug: job.ghost.slug,
      tableHtmlById,
    });
  }

  return { tables: results };
}

module.exports = { runPagePipeline };
