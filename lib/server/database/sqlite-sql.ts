// Deliberately limited compatibility for the application's existing parameterized
// SQL. It is not a general PostgreSQL parser. Data values never enter SQL text.
export function sqliteSql(source: string, inTransaction: boolean) {
  if (
    /^\s*SELECT\s+pg_advisory_xact_lock\(hashtextextended\(\$\d+,\s*0\)\)\s*;?$/i.test(
      source,
    )
  ) {
    if (!inTransaction)
      throw new Error(
        "SQLite advisory-lock compatibility requires BEGIN IMMEDIATE",
      );
    return "SELECT 1";
  }
  if (/\bFOR UPDATE\b/i.test(source) && !inTransaction)
    throw new Error("SQLite row-lock compatibility requires BEGIN IMMEDIATE");
  let text = source.replace(/\s+FOR UPDATE(?:\s+OF\s+\w+)?\s*;?$/i, "");
  text = text.replace(
    /EXTRACT\(EPOCH FROM \(now\(\)-([\w.]+)\)\)\*1000/gi,
    "shish_elapsed_ms($1)",
  );
  text = text.replace(
    /to_char\(([\w.]+) AT TIME ZONE 'Asia\/Tehran',\s*'YYYY-MM-DD'\)/gi,
    "shish_tehran_day($1)",
  );
  text = text.replace(
    /to_char\(([\w.]+) AT TIME ZONE 'UTC',\s*'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'\)/gi,
    "shish_timestamp($1)",
  );
  text = text.replace(
    /((?:now|clock_timestamp)\(\))\s*([+-])\s*interval\s*'([^']+)'/gi,
    (_, base, sign, amount) =>
      `shish_add_time(${base}, '${sign === "-" ? "-" : ""}${amount}')`,
  );
  text = text.replace(/(\$\d+)::timestamptz\b/gi, "shish_timestamp($1)");
  text = text
    .replace(/jsonb_array_length\(/gi, "json_array_length(")
    .replace(/\bGREATEST\(/gi, "max(");
  // Cast aggregates (including FILTER) first so their public alias stays intact.
  text = text.replace(
    /(count\([^)]*\)(?:\s+FILTER\s*\([^)]*\))?)::int\b/gi,
    "CAST($1 AS INTEGER)",
  );
  text = text.replace(
    /([\w.]+)::float\b(\s+AS\s+\w+)?/gi,
    (_, column, alias) =>
      `CAST(${column} AS REAL)${alias ?? ` AS ${column.split(".").at(-1)}`}`,
  );
  text = text.replace(/::jsonb\b/gi, "");
  text = text.replace(
    /drafts\.input\s*=\s*excluded\.input/gi,
    "shish_json_equal(drafts.input,excluded.input)",
  );
  if (
    /::|\bEXTRACT\b|\bAT TIME ZONE\b|\binterval\b|\bpg_advisory|\bFOR UPDATE\b/i.test(
      text,
    )
  )
    throw new Error(
      "Unsupported SQL in the local SQLite adapter; add explicit parity coverage",
    );
  return text;
}
