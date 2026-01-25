const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");
const jwt = require("jsonwebtoken");
const cheerio = require("cheerio");

const DEFAULT_ADMIN_VERSION = "v5";

function normalizeBaseUrl(baseUrl) {
  let url = baseUrl.trim();
  if (!url) throw new Error("GHOST_ADMIN_API_URL is empty");

  if (!/\/ghost\/api\/admin\/?$/i.test(url)) {
    url = url.replace(/\/+$/, "");
    url += "/ghost/api/admin/";
  } else if (!url.endsWith("/")) {
    url += "/";
  }

  return url;
}

function getAdminConfig() {
  const { GHOST_ADMIN_API_URL, GHOST_ADMIN_API_KEY, GHOST_ADMIN_API_VERSION } =
    process.env;

  if (!GHOST_ADMIN_API_URL || !GHOST_ADMIN_API_KEY) {
    throw new Error(
      "Missing Ghost env vars: GHOST_ADMIN_API_URL, GHOST_ADMIN_API_KEY",
    );
  }

  const [id, secret] = GHOST_ADMIN_API_KEY.split(":");
  if (!id || !secret) {
    throw new Error("GHOST_ADMIN_API_KEY must be in the format <id>:<secret>");
  }

  return {
    baseUrl: normalizeBaseUrl(GHOST_ADMIN_API_URL),
    keyId: id,
    secret,
    version: GHOST_ADMIN_API_VERSION || DEFAULT_ADMIN_VERSION,
  };
}

function createAdminToken({ keyId, secret, version }) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    iat: issuedAt,
    exp: issuedAt + 300,
    aud: `/${version}/admin/`,
  };

  return jwt.sign(payload, Buffer.from(secret, "hex"), {
    algorithm: "HS256",
    keyid: keyId,
  });
}

function requestJson({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "http:" ? http : https;
    const payload = body ? JSON.stringify(body) : null;

    const requestHeaders = {
      ...headers,
    };

    if (payload) {
      requestHeaders["Content-Type"] =
        requestHeaders["Content-Type"] || "application/json";
      requestHeaders["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = client.request(
      {
        method,
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: `${urlObj.pathname}${urlObj.search}`,
        headers: requestHeaders,
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          const contentType = res.headers["content-type"] || "";
          const isJson = contentType.includes("application/json");
          const parsed = isJson && data ? safeJsonParse(data) : data;

          if (res.statusCode >= 400) {
            const error = new Error(
              `Ghost API request failed (${res.statusCode})`,
            );
            error.statusCode = res.statusCode;
            error.response = parsed;
            return reject(error);
          }

          resolve(parsed);
        });
      },
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function buildUrl(baseUrl, path, query) {
  const url = new URL(path, baseUrl);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value == null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

function normalizeContentType(type) {
  if (!type) throw new Error("Ghost content type is required");
  if (type === "page") return "pages";
  if (type === "post") return "posts";
  if (type === "pages" || type === "posts") return type;
  throw new Error(`Unsupported Ghost content type "${type}"`);
}

async function ghostRequest({ method, path, query, body }) {
  const config = getAdminConfig();
  const token = createAdminToken(config);
  const url = buildUrl(config.baseUrl, path, query);

  return requestJson({
    method,
    url,
    headers: {
      Authorization: `Ghost ${token}`,
    },
    body,
  });
}

async function fetchBySlug({ type, slug }) {
  const contentType = normalizeContentType(type);
  const response = await ghostRequest({
    method: "GET",
    path: `${contentType}/`,
    query: {
      filter: `slug:'${slug}'`,
      limit: "1",
      fields: "id,slug,title,html,updated_at",
    },
  });

  const items = response[contentType] || [];
  return items.length > 0 ? items[0] : null;
}

async function fetchById({ type, id }) {
  const contentType = normalizeContentType(type);
  const response = await ghostRequest({
    method: "GET",
    path: `${contentType}/${id}/`,
    query: { fields: "id,slug,title,html,updated_at" },
  });

  const items = response[contentType] || [];
  return items.length > 0 ? items[0] : null;
}

async function updateHtml({ type, id, html, updated_at }) {
  const contentType = normalizeContentType(type);
  const response = await ghostRequest({
    method: "PUT",
    path: `${contentType}/${id}/`,
    query: { source: "html" },
    body: {
      [contentType]: [{ id, html, updated_at }],
    },
  });

  const items = response[contentType] || [];
  return items.length > 0 ? items[0] : null;
}

function replaceTableHtml({ html, tableId, newTableHtml }) {
  if (!tableId) throw new Error("tableId is required to replace a table");
  if (!newTableHtml) throw new Error("newTableHtml is required");

  const $ = cheerio.load(html, { decodeEntities: false });
  const selector = `figure[data-rp-table-id="${tableId}"]`;
  const matches = $(selector);

  if (matches.length === 0) {
    throw new Error(`No table found with data-rp-table-id="${tableId}"`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple tables found with data-rp-table-id="${tableId}"`,
    );
  }

  matches.replaceWith(newTableHtml);
  return $.root().html();
}

async function updateTableBySlug({
  type,
  slug,
  tableId,
  newTableHtml,
}) {
  const content = await fetchBySlug({ type, slug });
  if (!content) {
    throw new Error(
      `Ghost ${type} with slug "${slug}" not found`,
    );
  }

  const updatedHtml = replaceTableHtml({
    html: content.html || "",
    tableId,
    newTableHtml,
  });

  return updateHtml({
    type,
    id: content.id,
    html: updatedHtml,
    updated_at: content.updated_at,
  });
}

module.exports = {
  fetchBySlug,
  fetchById,
  updateHtml,
  replaceTableHtml,
  updateTableBySlug,
};
