const DEFAULT_TABLE_CLASS = "rp-table";

const SORT_TABLE_CLASS = "table-sort-columns";
const SORT_ROW_CLASS = "table-sort-rows";

const HEATMAP_CLASS_MAP = {
  one: "table-heatmap-one",
  two: "table-heatmap-two",
  "red-green": "table-heatmap-red-green",
};

function generateTableHtml(tableSpec) {
  const table = tableSpec && tableSpec.table ? tableSpec.table : tableSpec;
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
    throw new Error("Table spec must include columns and rows arrays.");
  }

  const figureCaption = table.figcaption || table.caption || "";
  const { tableClasses, tableAttributes, figureClasses, figureAttributes } =
    buildTableMeta(table);
  const sortableColumns = isTableSortableColumns(tableClasses, table.settings);
  const sortableRows = isTableSortableRows(tableClasses, table.settings);

  const columnDefs = table.columns;
  const rowDefs = table.rows;

  validateRowLengths(columnDefs, rowDefs);
  if (sortableRows) validateRowHeaders(rowDefs);

  const lines = [];
  lines.push(
    `<figure${renderClassAttr(figureClasses)}${renderAttrs(figureAttributes)}>`,
  );
  lines.push(`  <div class="rp-table__card">`);
  lines.push(`    <div class="rp-table__scroll">`);
  lines.push(
    `      <table${renderClassAttr(tableClasses)}${renderAttrs(
      tableAttributes,
    )}>`,
  );

  lines.push(`        <thead>`);
  lines.push(`          <tr>`);
  columnDefs.forEach((column) => {
    lines.push(
      `            ${renderColumnHeader(column)}`,
    );
  });
  lines.push(`          </tr>`);
  lines.push(`        </thead>`);

  lines.push(`        <tbody>`);

  rowDefs.forEach((row) => {
    lines.push(
      `          ${renderRow(row, columnDefs, {
        sortableColumns,
        sortableRows,
      })}`,
    );
  });

  lines.push(`        </tbody>`);
  lines.push(`      </table>`);
  lines.push(`    </div>`);
  lines.push(`  </div>`);
  if (figureCaption) {
    lines.push(`  <figcaption>${toText(figureCaption)}</figcaption>`);
  }
  lines.push(`</figure>`);

  return lines.join("\n");
}

function buildTableMeta(table) {
  const tableClasses = new Set(table.classes || []);
  const tableAttributes = { ...(table.attributes || {}) };
  const figureSpec = table.figure || {};
  const figureClasses = new Set([
    DEFAULT_TABLE_CLASS,
    ...(figureSpec.classes || []),
  ]);
  const figureAttributes = { ...(figureSpec.attributes || {}) };

  if (table.id && !hasAttr(figureAttributes, "data-rp-table-id")) {
    figureAttributes["data-rp-table-id"] = table.id;
  }

  const settings = table.settings || {};

  applyTableSettings(tableClasses, tableAttributes, figureClasses, settings);

  return {
    tableClasses,
    tableAttributes,
    figureClasses,
    figureAttributes,
  };
}

function applyTableSettings(
  tableClasses,
  tableAttributes,
  figureClasses,
  settings,
) {
  if (settings.sortableColumns) {
    tableClasses.add(SORT_TABLE_CLASS);
  }
  if (settings.sortableRows) {
    tableClasses.add(SORT_ROW_CLASS);
  }

  if (settings.reorder === "columns") {
    tableClasses.add("table-reorder-columns");
  } else if (settings.reorder === "rows") {
    tableClasses.add("table-reorder-rows");
  } else if (settings.reorder === "both") {
    tableClasses.add("table-reorder-both");
  }

  if (settings.resize === "columns") {
    tableClasses.add("table-resize-columns");
  } else if (settings.resize === "rows") {
    tableClasses.add("table-resize-rows");
  } else if (settings.resize === "both") {
    tableClasses.add("table-resize-both");
  }

  if (settings.density) {
    tableClasses.add(`table-density-${settings.density}`);
  }

  if (settings.layout === "fixed") {
    tableClasses.add("table-layout-fixed");
  }

  if (settings.width === "max-content") {
    tableClasses.add("table-width-max-content");
  }

  if (settings.filters && settings.filters.enabled) {
    tableClasses.add("table-filters");
  }
  if (settings.filters && settings.filters.search) {
    if (!hasAttr(tableAttributes, "data-rp-search")) {
      tableAttributes["data-rp-search"] = "1";
    }
  }

  if (settings.heatmap) {
    const schemeClass = HEATMAP_CLASS_MAP[settings.heatmap.scheme];
    if (schemeClass) {
      figureClasses.add(schemeClass);
    }
    if (settings.heatmap.scope) {
      if (!hasAttr(tableAttributes, "data-heat-scope")) {
        tableAttributes["data-heat-scope"] = settings.heatmap.scope;
      }
    }
  }
}

function renderColumnHeader(column) {
  if (!column || !column.key || !column.label) {
    throw new Error("Column is missing required key or label.");
  }

  const classes = new Set(column.classes || []);
  const attributes = { ...(column.attributes || {}) };
  const styles = {};

  if (column.align) {
    classes.add(`column-align-${column.align}`);
  }
  if (column.valign) {
    classes.add(`column-valign-${column.valign}`);
  }

  if (column.width) {
    classes.add("column-width");
    if (column.width.value) {
      styles["--rp-table-column-width"] = column.width.value;
    }
    if (column.width.min) {
      styles["--rp-table-column-min-width"] = column.width.min;
    }
    if (column.width.max) {
      styles["--rp-table-column-max-width"] = column.width.max;
    }
  }

  if (column.format && column.format.type) {
    classes.add(`column-format-${column.format.type}`);
    if (
      column.format.decimals != null &&
      !hasAttr(attributes, "data-format-decimals")
    ) {
      attributes["data-format-decimals"] = String(column.format.decimals);
    }
    if (
      column.format.round != null &&
      !hasAttr(attributes, "data-format-round")
    ) {
      attributes["data-format-round"] = String(column.format.round);
    }
  }

  if (column.filter && column.filter.type) {
    classes.add(`column-filter-${column.filter.type}`);
    if (column.filter.defaultHidden) {
      if (!hasAttr(attributes, "data-filter-default")) {
        attributes["data-filter-default"] = "hidden";
      }
    }
  }

  if (column.total) {
    classes.add("table-total-column");
  }
  if (column.distribution) {
    classes.add("column-distribution");
  }

  if (!hasAttr(attributes, "data-col-key")) {
    attributes["data-col-key"] = column.key;
  }

  return renderTag("th", {
    classes,
    attributes,
    styles,
    content: toText(column.label),
  });
}

function renderRow(row, columns, { sortableColumns, sortableRows }) {
  if (!row || !Array.isArray(row.cells)) {
    throw new Error("Row is missing required cells array.");
  }

  const classes = new Set(row.classes || []);
  const attributes = { ...(row.attributes || {}) };
  const styles = {};

  if (row.total) {
    classes.add("table-total-row");
  }
  if (row.align) {
    classes.add(`row-align-${row.align}`);
  }
  if (row.valign) {
    classes.add(`row-valign-${row.valign}`);
  }

  if (row.height) {
    if (row.height.value) {
      classes.add("row-height");
      styles["--rp-table-row-height"] = row.height.value;
    }
    if (row.height.min) {
      classes.add("row-min-height");
      styles["--rp-table-row-min-height"] = row.height.min;
    }
    if (row.height.max) {
      classes.add("row-max-height");
      styles["--rp-table-row-max-height"] = row.height.max;
    }
  }

  const rowCells = [];
  const rowHasLabel = row.label != null && row.label !== "";

  if (rowHasLabel) {
    const headerAttributes = {};
    if (sortableRows) {
      headerAttributes["data-sort-value"] = String(row.label);
    }
    rowCells.push(
      renderTag("th", {
        attributes: headerAttributes,
        content: toText(row.label),
        options: { scope: "row" },
      }),
    );
  }

  const columnOffset = rowHasLabel ? 1 : 0;
  row.cells.forEach((cell, index) => {
    const column = columns[index + columnOffset];
    rowCells.push(
      renderCell(cell, column, {
        sortableColumns,
      }),
    );
  });

  const rowContent = rowCells.join("");

  return renderTag("tr", {
    classes,
    attributes,
    styles,
    content: rowContent,
  });
}

function renderCell(cell, column, { sortableColumns }) {
  if (!cell) {
    return renderTag("td", { content: "" });
  }

  const classes = new Set(cell.classes || []);
  const attributes = { ...(cell.attributes || {}) };
  const styles = {};

  if (cell.align) {
    classes.add(`cell-align-${cell.align}`);
  }
  if (cell.valign) {
    classes.add(`cell-valign-${cell.valign}`);
  }

  if (cell.format && cell.format.type) {
    classes.add(`cell-format-${cell.format.type}`);
    if (
      cell.format.decimals != null &&
      !hasAttr(attributes, "data-format-decimals")
    ) {
      attributes["data-format-decimals"] = String(cell.format.decimals);
    }
    if (
      cell.format.round != null &&
      !hasAttr(attributes, "data-format-round")
    ) {
      attributes["data-format-round"] = String(cell.format.round);
    }
  }

  if (cell.raw != null && !hasAttr(attributes, "data-format-value")) {
    attributes["data-format-value"] = String(cell.raw);
  }

  if (cell.sort && cell.sort.primary != null) {
    attributes["data-sort-value"] = String(cell.sort.primary);
    if (cell.sort.secondary != null) {
      attributes["data-sort-secondary"] = String(cell.sort.secondary);
    }
  }

  if (cell.filter) {
    if (cell.filter.value != null) {
      attributes["data-filter-value"] = String(cell.filter.value);
    }
    if (cell.filter.label != null) {
      attributes["data-filter-label"] = String(cell.filter.label);
    }
    if (cell.filter.type && !hasAttr(attributes, "data-filter-type")) {
      attributes["data-filter-type"] = String(cell.filter.type);
    }
    if (cell.filter.skip) {
      attributes["data-filter-skip"] = "1";
    }
  }

  if (cell.heat && cell.heat.value != null) {
    attributes["data-heat"] = String(cell.heat.value);
    if (cell.heat.min != null) {
      attributes["data-heat-min"] = String(cell.heat.min);
    }
    if (cell.heat.max != null) {
      attributes["data-heat-max"] = String(cell.heat.max);
    }
  }

  if (sortableColumns && isColumnSortable(column)) {
    ensureSortValue(cell, column);
  }

  const content = renderCellValue(cell);

  return renderTag("td", {
    classes,
    attributes,
    styles,
    content,
  });
}

function renderCellValue(cell) {
  if (cell.distribution && Array.isArray(cell.distribution.values)) {
    const values = cell.distribution.values.map((value) => {
      if (typeof value === "number") {
        return `$${value.toLocaleString("en-US")}`;
      }
      return `$${String(value)}`;
    });
    return values.join(", ");
  }

  if (cell.value == null) return "";
  return toText(cell.value);
}

function validateRowLengths(columns, rows) {
  rows.forEach((row, index) => {
    const hasLabel = row.label != null && row.label !== "";
    const expected = columns.length - (hasLabel ? 1 : 0);
    if (row.cells.length !== expected) {
      throw new Error(
        `Row ${index + 1} has ${row.cells.length} cells, expected ${expected}.`,
      );
    }
  });
}

function validateRowHeaders(rows) {
  rows.forEach((row, index) => {
    if (row.label == null || row.label === "") {
      throw new Error(
        `Row ${index + 1} is missing a label but row sorting is enabled.`,
      );
    }
  });
}

function isTableSortableColumns(tableClasses, settings) {
  return (
    tableClasses.has(SORT_TABLE_CLASS) ||
    (settings && settings.sortableColumns)
  );
}

function isTableSortableRows(tableClasses, settings) {
  return tableClasses.has(SORT_ROW_CLASS) || (settings && settings.sortableRows);
}

function isColumnSortable(column) {
  if (!column || !column.sort) return true;
  if (typeof column.sort.enabled === "boolean") {
    return column.sort.enabled;
  }
  return true;
}

function ensureSortValue(cell, column) {
  const hasSortValue =
    (cell.sort && cell.sort.primary != null) ||
    (cell.attributes && cell.attributes["data-sort-value"] != null);

  if (!hasSortValue) {
    throw new Error(
      `Missing sort.primary for sortable column "${column.key}".`,
    );
  }
}

function renderTag(
  tag,
  { classes, attributes, styles, content, options } = {},
) {
  const classAttr = renderClassAttr(classes);
  const styleAttr = renderStyleAttr(styles);
  const attrs = renderAttrs(attributes);
  const scopeAttr =
    options && options.scope ? ` scope="${options.scope}"` : "";

  return `<${tag}${scopeAttr}${classAttr}${styleAttr}${attrs}>${content || ""}</${tag}>`;
}

function renderClassAttr(classes) {
  if (!classes) return "";
  const list = Array.from(classes).filter(Boolean);
  return list.length > 0 ? ` class="${list.join(" ")}"` : "";
}

function renderStyleAttr(styles) {
  if (!styles) return "";
  const entries = Object.entries(styles).filter(
    ([, value]) => value != null && value !== "",
  );
  if (entries.length === 0) return "";
  const styleValue = entries
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
  return ` style="${escapeAttr(styleValue)}"`;
}

function renderAttrs(attributes) {
  if (!attributes) return "";
  const entries = Object.entries(attributes).filter(
    ([, value]) => value != null,
  );
  if (entries.length === 0) return "";
  return entries
    .map(([key, value]) => ` ${key}="${escapeAttr(String(value))}"`)
    .join("");
}

function hasAttr(attributes, key) {
  return Object.prototype.hasOwnProperty.call(attributes, key);
}

function escapeAttr(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toText(value) {
  if (value == null) return "";
  return String(value);
}

module.exports = { generateTableHtml };
