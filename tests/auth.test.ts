import AuthDeveloperAPISDK from "../src/auth/userAuth";

test("logs in a user", async () => {
  const auth = new AuthDeveloperAPISDK(
    "http://localhost:8000/api/developer_api",
  );

  expect((await auth.login("Admin", "admin123")).success).toBe(true);
});

test("logs in a user with bad credentials", async () => {
  const auth = new AuthDeveloperAPISDK(
    "http://localhost:8000/api/developer_api",
  );

  expect((await auth.login("Admin", "wrongpassword")).success).toBe(false);
});


test("logs in a user with bad url", async () => {
  const auth = new AuthDeveloperAPISDK(
    "http://localhost:8000/api/developer_api//",
  );

  expect((await auth.login("Admin", "admin123")).success).toBe(false);
});