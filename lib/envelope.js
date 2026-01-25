function formatPublishedEastern(date) {
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${datePart} at ${timePart}`;
}

function buildHeader() {
  const { HEADER_AUTHOR, HEADER_DISCLOSURE, HEADER_LICENSE_URL } = process.env;

  if (!HEADER_AUTHOR || !HEADER_DISCLOSURE || !HEADER_LICENSE_URL) {
    throw new Error(
      "Missing required header env vars: HEADER_AUTHOR, HEADER_DISCLOSURE, HEADER_LICENSE_URL",
    );
  }

  return {
    author: HEADER_AUTHOR,
    disclosure: HEADER_DISCLOSURE,
    license_url: HEADER_LICENSE_URL,
    published: formatPublishedEastern(new Date()),
    generated_at: new Date().toISOString(),
  };
}

function buildEnvelope(contents, headerOverride) {
  return {
    header: headerOverride || buildHeader(),
    contents,
  };
}

module.exports = { buildEnvelope, buildHeader };
