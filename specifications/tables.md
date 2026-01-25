# Tables Specification (Ghost Theme)

This document defines **exact, unambiguous rules** for generating HTML tables that work with the Format theme table system. Agents must follow these rules precisely. When in doubt, use the minimal, valid structure and add only the classes needed.

---

## 1) Canonical Wrapper Structure (Required)

Every table **must** use the following wrapper hierarchy **exactly**:

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table>
        <thead>…</thead>
        <tbody>…</tbody>
      </table>
    </div>
  </div>
</figure>
```

Notes:
- The `rp-table` wrapper provides card styling and scrolling.
- The `rp-table__scroll` wrapper enables horizontal scrolling when needed.
- All additional table classes go on the `<table>` element (unless explicitly noted otherwise).

---

## 2) Row Header Conventions

If the first column is a **row header**, use `<th scope="row">` in the first cell of each `<tr>` in `<tbody>`:

```html
<tbody>
  <tr>
    <th scope="row">Row Label</th>
    <td>…</td>
  </tr>
</tbody>
```

This is required for row sorting, sticky row headers, and consistent styling.

---

## 3) Optional Feature Classes (Table‑Level)

Add classes to the `<table>` element to opt into behaviors. You can combine them.

### Sorting
- `table-sort-columns` → enables column sorting (via header handles)
- `table-sort-rows` → enables row sorting (via row header handles)

### Reordering
- `table-reorder-columns` → enable drag reordering of columns
- `table-reorder-rows` → enable drag reordering of rows
- `table-reorder-both` → enable both

### Resizing
- `table-resize-columns` → enable resizing columns
- `table-resize-rows` → enable resizing rows
- `table-resize-both` → enable both

### Density
- `table-density-compact` (default)
- `table-density-comfortable`
- `table-density-roomy`

### Layout
- `table-layout-fixed` → fixed table layout
- `table-width-max-content` → use `max-content` width

### Heatmaps
- Add `data-rp-heatmap` to `<table>` or add a heatmap class to the `<figure>`:
  - `table-heatmap-one`
  - `table-heatmap-two`
  - `table-heatmap-red-green`
- Scope (where heatmap normalization applies):
  - `data-heat-scope="table"` (default)
  - `data-heat-scope="row"`
  - `data-heat-scope="column"`

### Filters
- Add `table-filters` to the `<table>` to enable the filter UI
- For search bar in filters, add `data-rp-search="1"` to the `<table>`

---

## 4) Column‑Level Classes (Header Cells)

Use these on `<th>` in `<thead>` to apply behaviors and formatting **to the entire column**. The JS propagates them to cells.

### Alignment
- `column-align-left`
- `column-align-center`
- `column-align-right`
- `column-valign-top`
- `column-valign-middle`
- `column-valign-bottom`

### Widths
- `column-width` + CSS vars:
  - `--rp-table-column-width`
  - `--rp-table-column-min-width`
  - `--rp-table-column-max-width`

Example:
```html
<th class="column-width" style="--rp-table-column-width: 160px;">Price</th>
```

### Totals
- `table-total-column` → marks the column as a totals column

### Formatting
Use these for automatic formatting (sorting and display):
- `column-format-number`
- `column-format-dollars`
- `column-format-percent`
- `column-format-points`
- `column-format-miles`

Formatting can also be declared via data attributes (see §7.1) and at **multiple scopes**:
- Table: `table-format-*` or `data-format` / `data-format-type` on `<table>`
- Row: `row-format-*` or `data-format` / `data-format-type` on `<tr>`
- Column: `column-format-*` or `data-format` / `data-format-type` on header `<th>`
- Cell: `cell-format-*` or `data-format` / `data-format-type` on `<td>/<th>`

**Precedence (highest → lowest):** cell → row → column → table → figure (if present).

### Distribution (Box & Whisker)
- `column-distribution` → interprets each cell as a 5‑value distribution (see §9)

---

## 5) Row‑Level Classes

Apply to `<tr>` in `<tbody>`:

- `table-total-row` → marks the row as a totals row
- `row-align-*`, `row-valign-*` → row‑level alignment overrides
- `row-height`, `row-min-height`, `row-max-height` → row height control with variables:
  - `--rp-table-row-height`
  - `--rp-table-row-min-height`
  - `--rp-table-row-max-height`

Totals rows are **anchored** (not repositioned by sorting other rows), but totals themselves can be sorted if a totals column/row is the active sort key.

---

## 6) Cell‑Level Classes

Use on `<td>` / `<th>` for overrides:

- `cell-align-left|center|right`
- `cell-valign-top|middle|bottom`
- `cell-height`, `cell-min-height`, `cell-max-height` with variables

### Heatmap cell values
Put numeric values in `data-heat`:
```html
<td data-heat="180">$180</td>
```

Optional overrides per row/column:
- `data-heat-min="…"`
- `data-heat-max="…"`

---

## 7) Sorting (How to Declare)

Sorting is enabled by classes in §3. Sorting is **triggered only by the sort handle** inserted by JS; do not attach click handlers yourself.

**Mandatory requirement (for any sortable column):**\n
Every sortable cell **must** include `data-sort-value` (and optionally `data-sort-secondary`). This is the authoritative source for sorting.\n

```html
<td data-sort-value="240" data-sort-secondary="180">$240</td>
```

**Fallback behavior (worst‑case only):** If `data-sort-value` is missing, the system attempts to parse the visible cell text. This is **not reliable** and may sort unpredictably (e.g., currency symbols, commas, mixed text, or formatted labels). Treat this fallback as a last resort and **do not rely on it**.

---

## 8) Filtering (Parameters & Columns)

When `table-filters` is enabled, filters are generated per column. You can influence filter type by column content:

- **Numeric range**: numeric values (or formatted columns using `column-format-*`)
- **Date range**: date-formatted values
- **Discrete values**: repeated string values

For search bar, add `data-rp-search="1"` to the `<table>`; search is case‑insensitive and filters rows.

Hidden rows/columns:
- Hidden rows/columns are excluded from filter options.
- Header and totals rows/columns are not filterable.

### 8.1) Filter Type Declaration

Declare filter type on the **column header cell**:

**Class form**
- `column-filter-number`
- `column-filter-date`
- `column-filter-select`

**Data attribute form**
- `data-filter-type="number|date|select"`
- `data-filter="number|date|select"`

### 8.2) Filter Value/Label Overrides

You can override what a filter uses for values or labels on **cells**:

- `data-filter-value="…"` → value used for filtering (and search)
- `data-filter-label="…"` → label shown in select filters
- `data-filter-skip="1"` or `data-filterable="0"` → exclude from filters

To hide a column by default in the **Columns** filter group:
- `data-filter-default="hidden"` or `data-filter-hidden="1"` on the **header** cell

### 8.3) Column Keys

For stable filter state and column mapping, you may set:
- `data-col-key="unique-key"` on header `<th>`

If omitted, the system auto‑generates a key from the header text.

---

## 9) Distribution (Box & Whisker Cells)

To display a distribution in a column:

- Add `class="column-distribution"` to the `<th>` in `<thead>`.
- In each corresponding `<td>`, place **exactly five comma‑delimited dollar values**:
  - **min, Q1, median, Q3, max**

Example:
```html
<td>$120, $180, $240, $300, $390</td>
```

Rules:
- Values must be **numeric** and in ascending order.
- Dollar symbol is required; commas are allowed.
- Sorting uses **median** as primary, **Q1** as secondary.

---

## 10) Totals Rows/Columns

Totals are opt‑in and always styled differently.

- Totals **row**: add `table-total-row` to `<tr>`.
- Totals **column**: add `table-total-column` to its header `<th>`.

Totals are:
- visually lighter than headers
- bold by default
- placed with a stronger interior border
- excluded from sort reordering when other columns/rows are sorted

---

## 11) Density

Use exactly one of:

- `table-density-compact` (default)
- `table-density-comfortable`
- `table-density-roomy`

---

## 12) Required Accessibility & Semantics

- Always include `<thead>` and `<tbody>`.
- Use `<th scope="row">` for row headers.
- Use `<th>` for column headers.
- Avoid empty header cells; if needed, use `&nbsp;`.

---

## 13) Example: All Features Table

```html
<figure class="rp-table table-heatmap-red-green" data-heat-scope="row">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns table-sort-rows table-reorder-both table-resize-both table-density-comfortable" data-rp-search="1">
        <thead>
          <tr>
            <th>Program</th>
            <th class="column-format-dollars">Dining EV</th>
            <th class="column-format-dollars">Grocery EV</th>
            <th class="column-format-dollars">Travel EV</th>
            <th class="column-format-dollars">Other EV</th>
            <th class="table-total-column column-format-dollars">Total EV</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Chase Sapphire</th>
            <td data-heat="180">$180</td>
            <td data-heat="120">$120</td>
            <td data-heat="220">$220</td>
            <td data-heat="60">$60</td>
            <td>$580</td>
          </tr>
          <tr class="table-total-row">
            <th scope="row">Totals</th>
            <td>$1,080</td>
            <td>$810</td>
            <td>$1,090</td>
            <td>$490</td>
            <td>$3,470</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

---

## 14) Formatting Options (Precision / Rounding)

Formatting supports explicit precision and rounding controls. These can be set at any scope (cell/row/column/table).

- `data-format-decimals="2"` → fixed decimal count
- `data-format-precision="2"` → alias of `data-format-decimals`
- `data-format-round="0.5"` → round to step (e.g., 0.5, 1, 5, 10)
- `data-format-step="0.5"` → alias of `data-format-round`
- `data-format-value="1234.5"` → raw numeric value used for formatting/sorting

Example (column‑level rounding to nearest 10 dollars):
```html
<th class="column-format-dollars" data-format-round="10">Annual Fee</th>
```

---

## 15) Detailed Examples

### 15.1) Formatting + Precision + Custom Sort Value

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns">
        <thead>
          <tr>
            <th>Program</th>
            <th class="column-format-dollars" data-format-decimals="2">Annual Fee</th>
            <th class="column-format-percent" data-format-decimals="1">Rewards Rate</th>
            <th class="column-format-points">Bonus</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Card A</th>
            <td data-format-value="95">95</td>
            <td>2.5%</td>
            <td>60,000</td>
          </tr>
          <tr>
            <th scope="row">Card B</th>
            <td data-format-value="0">No AF</td>
            <td data-sort-value="3">3%</td>
            <td>30,000</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

### 15.2) Filters (Number, Date, Select) + Search

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-filters table-sort-columns" data-rp-search="1">
        <thead>
          <tr>
            <th>Program</th>
            <th class="column-filter-select">Issuer</th>
            <th class="column-filter-date">Launch Date</th>
            <th class="column-filter-number column-format-dollars">Annual Fee</th>
            <th class="column-filter-select" data-filter-default="hidden">Tier</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Card A</th>
            <td>Amex</td>
            <td>Jan 1, 2020</td>
            <td>250</td>
            <td>Premium</td>
          </tr>
          <tr>
            <th scope="row">Card B</th>
            <td>Chase</td>
            <td>Feb 1, 2019</td>
            <td>95</td>
            <td>Mid</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

### 15.3) Heatmap (Row Scope) + Per‑Row Range

```html
<figure class="rp-table table-heatmap-red-green" data-heat-scope="row">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns">
        <thead>
          <tr>
            <th>Program</th>
            <th>Dining EV</th>
            <th>Grocery EV</th>
            <th>Travel EV</th>
          </tr>
        </thead>
        <tbody>
          <tr data-heat-min="50" data-heat-max="250">
            <th scope="row">Card A</th>
            <td data-heat="180">$180</td>
            <td data-heat="120">$120</td>
            <td data-heat="220">$220</td>
          </tr>
          <tr>
            <th scope="row">Card B</th>
            <td data-heat="60">$60</td>
            <td data-heat="90">$90</td>
            <td data-heat="140">$140</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

### 15.4) Distribution Column (Box & Whisker)

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns">
        <thead>
          <tr>
            <th>Card</th>
            <th class="column-distribution">EV Distribution</th>
            <th class="column-format-dollars">Annual Fee</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Card A</th>
            <td>$120, $180, $240, $300, $390</td>
            <td>95</td>
          </tr>
          <tr>
            <th scope="row">Card B</th>
            <td>$80, $130, $190, $240, $320</td>
            <td>0</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

### 15.5) Totals + Sorting + Resize + Reorder

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table class="table-sort-columns table-sort-rows table-resize-both table-reorder-both table-density-comfortable">
        <thead>
          <tr>
            <th>Category</th>
            <th class="column-format-dollars">Monthly</th>
            <th class="column-format-dollars">Annual</th>
            <th class="column-format-percent">Rate</th>
            <th class="table-total-column column-format-dollars">Rewards</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Dining</th>
            <td>400</td>
            <td>4,800</td>
            <td>4%</td>
            <td>192</td>
          </tr>
          <tr class="table-total-row">
            <th scope="row">Total</th>
            <td>2,000</td>
            <td>24,000</td>
            <td></td>
            <td>756</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

---

## 16) Common Mistakes to Avoid

- Missing `rp-table__card` / `rp-table__scroll` wrappers
- Putting classes on `<figure>` instead of `<table>` (unless explicitly noted)
- Using `<td>` for row headers instead of `<th scope="row">`
- Leaving out `<thead>` / `<tbody>`
- Supplying distribution cells with fewer or unordered values

---

## 17) Minimal Valid Example

```html
<figure class="rp-table">
  <div class="rp-table__card">
    <div class="rp-table__scroll">
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Row A</th>
            <td>123</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</figure>
```

---

## 18) JSON Table Specification (Source of Truth)

This section defines a **canonical JSON schema** that can be converted into the HTML table system described above. All features must be expressible here. Use this JSON as the **single source of truth** for programmatic table generation.

> Key principle: **sorting must be driven by explicit sort values**. Every sortable cell must include `sort.primary` (and optionally `sort.secondary`).

### 18.1) Root Object

```json
{
  "table": {
    "id": "optional-unique-id",
    "caption": "optional caption text",
    "classes": ["table-sort-columns", "table-density-comfortable"],
    "attributes": {
      "data-rp-search": "1",
      "data-heat-scope": "row"
    },
    "settings": {
      "sortableColumns": true,
      "sortableRows": false,
      "reorder": "both",
      "resize": "columns",
      "density": "compact",
      "layout": "fixed",
      "width": "max-content",
      "heatmap": {
        "scheme": "red-green",
        "scope": "row"
      },
      "filters": {
        "enabled": true,
        "search": true
      }
    },
    "columns": [ ... ],
    "rows": [ ... ]
  }
}
```

### 18.2) Table-Level Fields

| Field | Type | Required | Notes |
|------|------|----------|------|
| `id` | string | no | Optional; used for external references |
| `caption` | string | no | Rendered as `<caption>` if provided |
| `classes` | string[] | no | Direct classes on `<table>` |
| `attributes` | object | no | Direct attributes on `<table>` (string values only) |
| `settings` | object | no | High-level convenience settings (converted into classes/attributes) |
| `columns` | array | **yes** | Column definitions, in display order |
| `rows` | array | **yes** | Row definitions, in display order |

### 18.3) `settings` Mapping Rules

Use `settings` to generate classes/attributes automatically:

- `sortableColumns: true` → add `table-sort-columns`
- `sortableRows: true` → add `table-sort-rows`
- `reorder: "columns"|"rows"|"both"` → add `table-reorder-*`
- `resize: "columns"|"rows"|"both"` → add `table-resize-*`
- `density: "compact"|"comfortable"|"roomy"` → add `table-density-*`
- `layout: "fixed"` → add `table-layout-fixed`
- `width: "max-content"` → add `table-width-max-content`
- `heatmap.scheme: "one"|"two"|"red-green"` → add figure class `table-heatmap-*` or `data-rp-heatmap`
- `heatmap.scope: "table"|"row"|"column"` → add `data-heat-scope`
- `filters.enabled: true` → add `table-filters`
- `filters.search: true` → add `data-rp-search="1"`

If `classes` / `attributes` conflict with derived settings, **explicit classes/attributes win**.

---

## 19) Column Definition

Each column definition maps to a `<th>` in `<thead>` and can apply column-wide behavior.

```json
{
  "key": "annual_fee",
  "label": "Annual Fee",
  "classes": ["column-format-dollars"],
  "attributes": {
    "data-filter-type": "number"
  },
  "align": "right",
  "valign": "middle",
  "width": {
    "value": "160px",
    "min": "120px",
    "max": "220px"
  },
  "format": {
    "type": "dollars",
    "decimals": 0,
    "round": 1
  },
  "filter": {
    "type": "number",
    "defaultHidden": false
  },
  "sort": {
    "enabled": true
  },
  "total": false,
  "distribution": false
}
```

### 19.1) Column Field Notes

| Field | Notes |
|------|------|
| `key` | **Required.** Used for stable mapping, `data-col-key`. Must be unique.
| `label` | Header text.
| `classes` | Applied to header `<th>`.
| `attributes` | Applied to header `<th>` (string values).
| `align` | Adds `column-align-*` class.
| `valign` | Adds `column-valign-*` class.
| `width` | Adds `column-width` class + inline CSS vars.
| `format` | Adds `column-format-*` class and `data-format-*` attributes.
| `filter` | Adds filter class/attributes + default hidden column behavior.
| `sort.enabled` | If true, ensure **every cell** in this column provides `sort.primary`.
| `total` | If true, add `table-total-column` class.
| `distribution` | If true, add `column-distribution` class.

---

## 20) Row Definition

Each row becomes a `<tr>` in `<tbody>`.

```json
{
  "key": "row-001",
  "label": "Chase Sapphire",
  "classes": [],
  "attributes": {},
  "total": false,
  "align": "left",
  "valign": "middle",
  "height": {
    "value": "auto",
    "min": "48px",
    "max": "120px"
  },
  "cells": [ ... ]
}
```

### 20.1) Row Field Notes

| Field | Notes |
|------|------|
| `label` | If provided, used for the first cell with `<th scope="row">`.
| `total` | If true, add `table-total-row` class.
| `align` / `valign` | Adds `row-align-*` / `row-valign-*` classes.
| `height` | Adds `row-height` / `row-min-height` / `row-max-height` classes + vars.

---

## 21) Cell Definition

Each cell maps to `<td>` (or the row header `<th scope="row">`).

```json
{
  "value": "$95",
  "raw": 95,
  "classes": [],
  "attributes": {},
  "align": "right",
  "valign": "middle",
  "format": {
    "type": "dollars",
    "decimals": 0,
    "round": 1
  },
  "sort": {
    "primary": 95,
    "secondary": null
  },
  "filter": {
    "value": "95",
    "label": "$95",
    "type": "number",
    "skip": false
  },
  "heat": {
    "value": 95,
    "min": null,
    "max": null
  },
  "distribution": {
    "values": [120, 180, 240, 300, 390]
  }
}
```

### 21.1) Cell Field Notes

| Field | Notes |
|------|------|
| `value` | Rendered inner text (string). |
| `raw` | Optional raw numeric value for formatting/sorting. |
| `format` | Adds `cell-format-*` class + `data-format-*`. |
| `sort.primary` | **Required for sortable columns.** Written to `data-sort-value`. |
| `sort.secondary` | Optional. Written to `data-sort-secondary`. |
| `filter.value` | Written to `data-filter-value`. |
| `filter.label` | Written to `data-filter-label`. |
| `filter.skip` | If true, set `data-filter-skip="1"`. |
| `heat.value` | Written to `data-heat`. |
| `heat.min` / `heat.max` | Written to `data-heat-min` / `data-heat-max`. |
| `distribution.values` | Five numeric values → rendered as `$min, $q1, $med, $q3, $max`.

---

## 22) Serialization Rules (JSON → HTML)

1. **Initialize `<table>`** with classes and attributes from `table.classes` and `table.attributes`.
2. **Apply `settings`** to add/derive classes + attributes (do not override explicit `classes/attributes`).
3. **Build `<thead>`** from `columns`:
   - Apply `data-col-key` from `column.key`.
   - Add column classes from `align`, `valign`, `format`, `filter`, `distribution`, `total`, `width`.
4. **Build `<tbody>`** from `rows`:
   - If `row.label` exists, render as `<th scope="row">` in first cell.
   - Apply row classes/attributes (alignment, height, totals).
5. **Cells**:
   - Render `value` as text content.
   - Always add `data-sort-value` for sortable columns.
   - Add formatting + filter + heat + distribution attributes if provided.
6. **Distribution columns**:
   - Render 5 values as a comma‑delimited `$` list in the cell.

---

## 23) Detailed JSON Example (All Features)

```json
{
  "table": {
    "settings": {
      "sortableColumns": true,
      "sortableRows": true,
      "reorder": "both",
      "resize": "both",
      "density": "comfortable",
      "heatmap": { "scheme": "red-green", "scope": "row" },
      "filters": { "enabled": true, "search": true }
    },
    "columns": [
      { "key": "program", "label": "Program" },
      { "key": "dining", "label": "Dining EV", "format": { "type": "dollars" } },
      { "key": "grocery", "label": "Grocery EV", "format": { "type": "dollars" } },
      { "key": "travel", "label": "Travel EV", "format": { "type": "dollars" } },
      { "key": "other", "label": "Other EV", "format": { "type": "dollars" } },
      { "key": "total", "label": "Total EV", "format": { "type": "dollars" }, "total": true }
    ],
    "rows": [
      {
        "label": "Chase Sapphire",
        "cells": [
          { "value": "$180", "sort": { "primary": 180 }, "heat": { "value": 180 } },
          { "value": "$120", "sort": { "primary": 120 }, "heat": { "value": 120 } },
          { "value": "$220", "sort": { "primary": 220 }, "heat": { "value": 220 } },
          { "value": "$60",  "sort": { "primary": 60  }, "heat": { "value": 60 } },
          { "value": "$580", "sort": { "primary": 580 } }
        ]
      },
      {
        "label": "Totals",
        "total": true,
        "cells": [
          { "value": "$1,080", "sort": { "primary": 1080 } },
          { "value": "$810", "sort": { "primary": 810 } },
          { "value": "$1,090", "sort": { "primary": 1090 } },
          { "value": "$490", "sort": { "primary": 490 } },
          { "value": "$3,470", "sort": { "primary": 3470 } }
        ]
      }
    ]
  }
}
```

---

## 24) Common Mistakes to Avoid (JSON)

- Missing `column.key` values (breaks mapping)
- Omitting `sort.primary` in sortable columns
- Passing formatted strings (e.g., `$1,200`) as `sort.primary` instead of numeric values
- Using fewer/more than 5 values for distribution cells
- Forgetting to mark totals as `total: true`
- Using inconsistent row lengths (cells count must match columns count)

