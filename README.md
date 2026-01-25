## Getting Started

This repository organizes logic which refreshes a library of JSON files based on data stored in the Reference Points Atlas data model. This enables the data to be served statically via Ghost CMS.

## Ghost CMS Service

The Ghost service in `lib/ghost.js` fetches Ghost pages/posts, replaces a target
table by `data-rp-table-id`, and updates the HTML back into Ghost via the Admin
API. This is the foundation for swapping HTML tables generated from JSON while
keeping the rest of the page intact.

### Required environment variables

- `GHOST_ADMIN_API_URL`: Base admin URL. Accepts either a full admin base
  (`https://example.com/ghost/api/admin/`) or the site root
  (`https://example.com`). The client will normalize to the admin base.
- `GHOST_ADMIN_API_KEY`: Admin API key in `<id>:<secret>` format.
- `GHOST_ADMIN_API_VERSION` (optional): Admin API version, defaults to `v5`.

### Core behaviors

- Only updates tables that include a **unique** `data-rp-table-id` on the
  `<figure>` element. If the ID is missing, not found, or duplicated, the
  operation fails.
- Updates are performed with `source=html` and the original `updated_at` value
  to satisfy Ghost concurrency rules.
- HTML is modified by replacing only the target table and leaving the rest of
  the document unchanged.

### Available helpers

- `fetchBySlug({ type, slug })`: Fetches a `page` or `post` by slug.
- `fetchById({ type, id })`: Fetches a `page` or `post` by ID.
- `updateHtml({ type, id, html, updated_at })`: Updates a page/post HTML body.
- `replaceTableHtml({ html, tableId, newTableHtml })`: Replaces a table by ID.
- `updateTableBySlug({ type, slug, tableId, newTableHtml })`: Full fetch →
  replace → update flow by slug.

### Minimal example

```js
const { updateTableBySlug } = require("./lib/ghost");

async function run() {
  await updateTableBySlug({
    type: "page",
    slug: "smoke-test",
    tableId: "transfers-airline-matrix",
    newTableHtml: "<figure data-rp-table-id=\"transfers-airline-matrix\">...</figure>",
  });
}

run().catch(console.error);
```

## Table Generator Service

The table generator in `lib/table_generator.js` converts a JSON table spec
(`specifications/tables.schema.json`) into HTML that matches the Format theme
table system (`specifications/tables.md`). It is strict by design: the output
follows the exact wrapper structure and enforces required sorting metadata.

### Purpose and scope

- Input: a JSON object that conforms to the spec in
  `specifications/tables.schema.json`.
- Output: a single HTML string containing the canonical wrapper hierarchy and a
  fully populated `<table>`.
- Guarantees:
  - The `rp-table` wrapper structure is always present.
  - Table/column/row/cell classes and attributes are applied per spec.
  - Sortable columns must include `sort.primary` in every cell, or generation
    fails fast with a clear error.

### Input shapes

`generateTableHtml` accepts either:

1. A root object with a `table` key:

```json
{
  "table": {
    "columns": [],
    "rows": []
  }
}
```

2. Or a direct `table` object (same as the `table` property above):

```json
{
  "columns": [],
  "rows": []
}
```

The generator normalizes both forms and treats them identically.

### Required fields

- `columns`: array of column definitions (min 1)
- `rows`: array of row definitions (min 1)

Each column must include:
- `key` (unique per table)
- `label` (column header text)

Each row must include:
- `cells` (array)

If row sorting is enabled, each row must also include:
- `label` (rendered as `<th scope="row">`)

### Canonical HTML wrapper

The generator always returns:

```html
<figure class="rp-table" data-rp-table-id="...">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table>...</table>
    </div>
  </div>
  <figcaption>Last updated January 18, 2026 at 18:05 ET</figcaption>
</figure>
```

Notes:
- `data-rp-table-id` is added **only** when `table.id` is provided.
- Additional heatmap classes may be added to the `<figure>`.
- All other feature classes are added to the `<table>`.
- Use `table.figure.classes` to apply `kg-width-wide` or `kg-width-full`.
- The generator does not render `<caption>` inside the table.

### Figure configuration

To control figure-level layout (Ghost widths) or add figure attributes, use the
`figure` object on the table:

```json
{
  "figure": {
    "classes": ["kg-width-wide"],
    "attributes": {
      "data-rp-table-id": "transferrable_currency_airline_matrix_table"
    }
  }
}
```

### Settings to class/attribute mapping

The generator maps `table.settings` into classes/attributes **unless** the class
or attribute is already explicitly set in `table.classes` or
`table.attributes`. Explicit values always win.

| Setting | Result |
|---|---|
| `sortableColumns: true` | add `table-sort-columns` |
| `sortableRows: true` | add `table-sort-rows` |
| `reorder: "columns"` | add `table-reorder-columns` |
| `reorder: "rows"` | add `table-reorder-rows` |
| `reorder: "both"` | add `table-reorder-both` |
| `resize: "columns"` | add `table-resize-columns` |
| `resize: "rows"` | add `table-resize-rows` |
| `resize: "both"` | add `table-resize-both` |
| `density: "compact"` | add `table-density-compact` |
| `density: "comfortable"` | add `table-density-comfortable` |
| `density: "roomy"` | add `table-density-roomy` |
| `layout: "fixed"` | add `table-layout-fixed` |
| `width: "max-content"` | add `table-width-max-content` |
| `filters.enabled: true` | add `table-filters` |
| `filters.search: true` | add `data-rp-search="1"` |
| `heatmap.scheme` | add figure class `table-heatmap-*` |
| `heatmap.scope` | add `data-heat-scope="<scope>"` on table |

### Column mapping rules

Each column becomes a `<th>` in `<thead>` with:

- `data-col-key` from `column.key` (if not already provided in attributes)
- Optional classes derived from column fields:
  - `align` -> `column-align-*`
  - `valign` -> `column-valign-*`
  - `format.type` -> `column-format-*`
  - `filter.type` -> `column-filter-*`
  - `total: true` -> `table-total-column`
  - `distribution: true` -> `column-distribution`
  - `width` -> `column-width` plus inline CSS vars

Additional details:
- `format.decimals` -> `data-format-decimals`
- `format.round` -> `data-format-round`
- `filter.defaultHidden: true` -> `data-filter-default="hidden"`

### Row mapping rules

Each row becomes a `<tr>` in `<tbody>`. If `row.label` is present, the first
cell is a row header:

```html
<th scope="row">Row Label</th>
```

Row-level options:
- `total: true` -> `table-total-row`
- `align` / `valign` -> `row-align-*` / `row-valign-*`
- `height` -> `row-height`, `row-min-height`, `row-max-height` plus CSS vars

Row sorting note:
- If table rows are sortable, every row must have a `label`. The generator
  throws if any row is missing a label.

### Cell mapping rules

Each cell becomes a `<td>` with optional attributes and classes:

- `align` / `valign` -> `cell-align-*` / `cell-valign-*`
- `format.type` -> `cell-format-*`
- `raw` -> `data-format-value`
- `sort.primary` -> `data-sort-value`
- `sort.secondary` -> `data-sort-secondary`
- `filter.value` -> `data-filter-value`
- `filter.label` -> `data-filter-label`
- `filter.type` -> `data-filter-type`
- `filter.skip: true` -> `data-filter-skip="1"`
- `heat.value` -> `data-heat`
- `heat.min` -> `data-heat-min`
- `heat.max` -> `data-heat-max`

Distribution cells:
- If `cell.distribution.values` is present (array of 5), the cell text is
  rendered as `"$min, $q1, $med, $q3, $max"` with thousands separators.

Sorting enforcement:
- If a column is sortable (default), every cell **must** provide
  `sort.primary` or an explicit `data-sort-value` attribute, or the generator
  throws.

### Validation and error behavior

The generator throws errors in these cases:

- Missing required `columns` or `rows` arrays.
- Column missing `key` or `label`.
- Row missing `cells`.
- Row length mismatch: `row.cells.length` must equal
  `columns.length` minus 1 when `row.label` is present.
- Row sorting enabled but any row lacks `label`.
- Sortable column missing `sort.primary` for any cell.

These are hard failures to prevent invalid HTML tables from reaching Ghost.

### Output guarantees

- Output is a single HTML string (no DOM library required to consume it).
- HTML is stable and deterministic for a given JSON spec.
- All attributes are stringified and safely HTML-escaped.

### Minimal usage example

```js
const { generateTableHtml } = require("./lib/table_generator");

const html = generateTableHtml({
  table: {
    id: "example-table",
    settings: { sortableColumns: true, sortableRows: true },
    columns: [
      { key: "program", label: "Program" },
      { key: "rate", label: "Rate" }
    ],
    rows: [
      {
        label: "Chase",
        cells: [
          { value: "1:1", sort: { primary: 1 } }
        ]
      }
    ]
  }
});
```

### Common pitfalls

- Omitting `sort.primary` while enabling column sorting.
- Forgetting row labels when row sorting is enabled.
- Miscounting row cells when `row.label` is present.
- Putting feature classes on `<figure>` instead of `<table>`.

### Extended example (JSON -> HTML)

Below is a more complete example showing settings, column formatting, row
labels, sorting, filters, heatmap, and distribution cells. The JSON is followed
by the HTML that the generator produces.

JSON input:

```json
{
  "table": {
    "id": "sample-table",
    "figcaption": "Last updated January 18, 2026 at 18:05 ET",
    "settings": {
      "sortableColumns": true,
      "sortableRows": true,
      "reorder": "both",
      "resize": "both",
      "density": "comfortable",
      "layout": "fixed",
      "width": "max-content",
      "heatmap": { "scheme": "red-green", "scope": "row" },
      "filters": { "enabled": true, "search": true }
    },
    "columns": [
      { "key": "program", "label": "Program" },
      {
        "key": "rate",
        "label": "Rate",
        "format": { "type": "percent", "decimals": 1 },
        "filter": { "type": "number" },
        "sort": { "enabled": true }
      },
      {
        "key": "bonus",
        "label": "Bonus",
        "format": { "type": "points" },
        "filter": { "type": "number" },
        "sort": { "enabled": true }
      },
      {
        "key": "distribution",
        "label": "EV Distribution",
        "distribution": true
      },
      {
        "key": "total",
        "label": "Total",
        "total": true,
        "format": { "type": "dollars" }
      }
    ],
    "rows": [
      {
        "label": "Card A",
        "cells": [
          {
            "value": "2.5%",
            "sort": { "primary": 2.5 },
            "heat": { "value": 2.5 }
          },
          {
            "value": "60,000",
            "sort": { "primary": 60000 },
            "filter": { "value": 60000, "label": "60,000" }
          },
          {
            "distribution": { "values": [120, 180, 240, 300, 390] }
          },
          {
            "value": "$580",
            "sort": { "primary": 580 },
            "raw": 580
          }
        ]
      },
      {
        "label": "Totals",
        "total": true,
        "cells": [
          {
            "value": "",
            "sort": { "primary": 0 }
          },
          {
            "value": "90,000",
            "sort": { "primary": 90000 }
          },
          {
            "distribution": { "values": [200, 260, 320, 380, 440] }
          },
          {
            "value": "$1,200",
            "sort": { "primary": 1200 },
            "raw": 1200
          }
        ]
      }
    ]
  }
}
```

HTML output:

```html
<figure class="rp-table table-heatmap-red-green" data-rp-table-id="sample-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns table-sort-rows table-reorder-both table-resize-both table-density-comfortable table-layout-fixed table-width-max-content table-filters" data-rp-search="1" data-heat-scope="row">
        <thead>
          <tr>
            <th data-col-key="program">Program</th>
            <th class="column-format-percent column-filter-number" data-col-key="rate" data-format-decimals="1">Rate</th>
            <th class="column-format-points column-filter-number" data-col-key="bonus">Bonus</th>
            <th class="column-distribution" data-col-key="distribution">EV Distribution</th>
            <th class="table-total-column column-format-dollars" data-col-key="total">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" data-sort-value="Card A">Card A</th>
            <td data-sort-value="2.5" data-heat="2.5">2.5%</td>
            <td data-sort-value="60000" data-filter-value="60000" data-filter-label="60,000">60,000</td>
            <td>$120, $180, $240, $300, $390</td>
            <td data-sort-value="580" data-format-value="580">$580</td>
          </tr>
          <tr class="table-total-row">
            <th scope="row" data-sort-value="Totals">Totals</th>
            <td data-sort-value="0"></td>
            <td data-sort-value="90000">90,000</td>
            <td>$200, $260, $320, $380, $440</td>
            <td data-sort-value="1200" data-format-value="1200">$1,200</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <figcaption>Last updated January 18, 2026 at 18:05 ET</figcaption>
</figure>
```
