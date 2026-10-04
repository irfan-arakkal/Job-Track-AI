-- A separate database for integration tests, so tests never touch dev data.
CREATE DATABASE jobtrack_test OWNER jobtrack;
-- A separate database for Playwright end-to-end tests.
CREATE DATABASE jobtrack_e2e OWNER jobtrack;
