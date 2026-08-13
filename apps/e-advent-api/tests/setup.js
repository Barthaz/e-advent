// Global after-env hooks (kept minimal — mocks live in helpers)
afterAll(async () => {
  // Allow open handles from mysql/socket to settle in CI
});
