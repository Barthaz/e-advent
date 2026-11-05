-- Import once using a migration account. Runtime account: SELECT, INSERT, UPDATE only.
CREATE TABLE soa_daily_stats (
  day_date DATE PRIMARY KEY,
  page_views BIGINT UNSIGNED NOT NULL DEFAULT 0,
  window_open_events BIGINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE soa_window_stats (
  day_date DATE NOT NULL,
  window_day TINYINT UNSIGNED NOT NULL,
  open_events BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day_date, window_day),
  CHECK (window_day BETWEEN 1 AND 24)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
