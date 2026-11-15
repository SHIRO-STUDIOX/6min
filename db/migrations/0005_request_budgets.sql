CREATE TABLE request_budgets (
 key text PRIMARY KEY,
 window_start timestamptz NOT NULL,
 count integer NOT NULL CHECK(count>0)
);
