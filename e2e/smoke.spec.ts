import { test, expect } from "@playwright/test";

test.describe("岩土钻孔编录系统 - 页面冒烟测试", () => {
  test("页面应该成功加载并显示标题", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("岩土钻孔编录");
  });

  test("页面应该显示角色切换按钮", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /岩土工程师/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /现场编录员/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /项目负责人/ })).toBeVisible();
  });

  test("页面应该显示归档导入/导出按钮", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /导出项目归档/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /导入项目归档/ })).toBeVisible();
  });

  test("页面应该显示钻孔列表和选择功能", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "选择钻孔", exact: true })).toBeVisible();
  });

  test("页面应该显示分层编辑器", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /数据编辑/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /钻孔柱状图/ })).toBeVisible();
  });

  test("页面应该显示质量检查入口", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /质量检查/ })).toBeVisible();
  });

  test("页面应该显示对比模式切换", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /对比模式/ })).toBeVisible();
  });

  test("页面应该显示新增钻孔表单", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /新增钻孔/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /钻孔编号/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /孔深/ })).toBeVisible();
  });

  test("页面应该显示清空数据按钮", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /清空本地项目数据/ })).toBeVisible();
  });

  test("页面 JavaScript 无严重错误", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForTimeout(2000);
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("IntersectionObserver") &&
        !e.includes("act(")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
