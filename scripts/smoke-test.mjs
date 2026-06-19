import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import path from "path";

const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const projectRoot = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function logStep(message) {
  console.log(`\n🔍 ${message}`);
}

function checkPass(message) {
  passed++;
  console.log(`  ✅ ${message}`);
}

function checkFail(message) {
  failed++;
  console.log(`  ❌ ${message}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(projectRoot, filePath);
  if (existsSync(fullPath)) {
    checkPass(`${description} 存在: ${filePath}`);
    return true;
  } else {
    checkFail(`${description} 不存在: ${filePath}`);
    return false;
  }
}

function checkPackageJsonScript(scriptName, expectedPattern) {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) {
    checkFail("package.json 不存在");
    return false;
  }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const scripts = pkg.scripts || {};

    if (!scripts[scriptName]) {
      checkFail(`package.json 缺少脚本: ${scriptName}`);
      return false;
    }

    if (expectedPattern && !scripts[scriptName].match(expectedPattern)) {
      checkFail(`脚本 ${scriptName} 内容不符合预期: ${scripts[scriptName]}`);
      return false;
    }

    checkPass(`package.json 脚本存在: ${scriptName}`);
    return true;
  } catch (e) {
    checkFail(`解析 package.json 失败: ${e.message}`);
    return false;
  }
}

function checkPackageJsonField(field, expectedValue, description) {
  const pkgPath = path.join(projectRoot, "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const value = field.split(".").reduce((o, k) => o?.[k], pkg);
    if (expectedValue ? value === expectedValue : value !== undefined) {
      checkPass(`${description}: ${value}`);
      return true;
    } else {
      checkFail(`${description} 不符合预期 (实际: ${value}, 期望: ${expectedValue})`);
      return false;
    }
  } catch (e) {
    checkFail(`检查 ${description} 失败: ${e.message}`);
    return false;
  }
}

function checkNodeModuleExists(moduleName, description) {
  const fullPath = path.join(projectRoot, "node_modules", moduleName);
  if (existsSync(fullPath)) {
    checkPass(`${description} 已安装: ${moduleName}`);
    return true;
  } else {
    checkFail(`${description} 未安装: ${moduleName}`);
    return false;
  }
}

function runCommand(cmd, description, cwd = projectRoot) {
  try {
    console.log(`  🚀 执行: ${cmd}`);
    const output = execSync(cmd, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf-8",
      timeout: 120000,
    });
    checkPass(`${description} 执行成功`);
    return { success: true, output };
  } catch (e) {
    checkFail(`${description} 执行失败: ${e.message}`);
    if (e.stdout) console.log(`\n--- STDOUT ---\n${e.stdout}`);
    if (e.stderr) console.log(`\n--- STDERR ---\n${e.stderr}`);
    return { success: false, output: e.stdout || "", error: e.stderr || "" };
  }
}

console.log("=".repeat(70));
console.log("🧪 岩土钻孔编录系统 - 浏览器冒烟测试");
console.log("=".repeat(70));

logStep("1/11 检查核心配置文件");
checkFileExists("package.json", "项目配置");
checkFileExists("vite.config.ts", "Vite 配置");
checkFileExists("tsconfig.json", "TypeScript 配置");
checkFileExists("eslint.config.js", "ESLint 配置");
checkFileExists(".husky/pre-commit", "Git 钩子");

logStep("2/11 检查 package.json 基本配置");
checkPackageJsonField("type", "module", "ESM 模式");
checkPackageJsonScript("typecheck", /tsc.*noEmit/);
checkPackageJsonScript("build", /vite build/);
checkPackageJsonScript("test", /vitest run/);
checkPackageJsonScript("test:coverage", /vitest.*coverage/);
checkPackageJsonScript("lint", /eslint/);
checkPackageJsonScript("quality", /typecheck.*build.*test/);
checkPackageJsonScript("quality:strict", /typecheck.*build.*coverage/);

logStep("3/11 检查关键依赖安装");
checkNodeModuleExists("typescript-eslint", "ESLint TypeScript 解析器");
checkNodeModuleExists("fake-indexeddb", "IndexedDB 测试模拟");
checkNodeModuleExists("@vitest/coverage-v8", "V8 覆盖率提供程序");
checkNodeModuleExists("husky", "Git Hooks 工具");
checkNodeModuleExists("lint-staged", "暂存文件 Lint 工具");

logStep("4/11 检查核心源文件");
checkFileExists("src/archive.ts", "归档导入导出模块");
checkFileExists("src/db.ts", "IndexedDB 持久化模块");
checkFileExists("src/types.ts", "类型定义");
checkFileExists("src/components/QualityCheckPanel.tsx", "质量检查面板");
checkFileExists("src/components/BoreholeChart.tsx", "单孔图表组件");
checkFileExists("src/components/MultiBoreholeChart.tsx", "多孔对比图表");
checkFileExists("src/hooks/useLayerDepthValidation.ts", "分层验证 Hook");

logStep("5/11 检查核心测试文件");
checkFileExists("src/archive.test.ts", "归档模块测试");
checkFileExists("src/db.test.ts", "IndexedDB 测试");
checkFileExists("src/components/QualityCheckPanel.test.tsx", "质量面板测试");
checkFileExists("src/components/BoreholeChart.test.tsx", "单孔图表测试");
checkFileExists("src/components/MultiBoreholeChart.test.tsx", "多孔图表测试");
checkFileExists("src/hooks/useLayerDepthValidation.test.ts", "分层 Hook 测试");
checkFileExists("src/test/setup.ts", "测试初始化");

logStep("6/11 检查 .gitignore 配置");
const gitignorePath = path.join(projectRoot, ".gitignore");
if (existsSync(gitignorePath)) {
  const gitignore = readFileSync(gitignorePath, "utf-8");
  const required = ["dist", "node_modules", "coverage", ".husky/_"];
  for (const pattern of required) {
    if (gitignore.includes(pattern)) {
      checkPass(`.gitignore 包含: ${pattern}`);
    } else {
      checkFail(`.gitignore 缺少: ${pattern}`);
    }
  }
}

logStep("7/11 检查 E2E 测试配置");
checkFileExists("playwright.config.ts", "Playwright 配置");
checkFileExists("e2e/smoke.spec.ts", "页面冒烟测试");
checkNodeModuleExists("@playwright/test", "Playwright 测试框架");

logStep("8/11 执行 ESLint 检查");
runCommand("npm run lint", "ESLint 检查");

logStep("9/11 执行 TypeScript 类型检查");
runCommand("npm run typecheck", "类型检查");

logStep("10/11 执行生产构建验证");
runCommand("npm run build", "生产构建");

logStep("11/11 执行浏览器页面冒烟测试");
runCommand("npm run smoke:e2e", "Playwright 页面冒烟测试");

console.log("\n" + "=".repeat(70));
console.log("📊 冒烟测试结果");
console.log("=".repeat(70));
console.log(`✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log("=".repeat(70));

if (failed > 0) {
  console.log("\n⚠️  冒烟检测发现问题，请检查上述失败项");
  process.exit(1);
} else {
  console.log("\n🎉 所有冒烟检查通过！质量门禁配置正常");
  console.log("\n💡 可执行以下命令进行更全面的检查：");
  console.log("   npm run quality       - 运行完整质量门禁（类型+构建+测试）");
  console.log("   npm run quality:strict - 运行严格质量门禁（含覆盖率）");
  console.log("   npm run smoke:e2e     - 仅运行 Playwright 页面冒烟测试");
  console.log("   npm run smoke:all     - 运行 CLI 冒烟 + 页面冒烟测试");
  console.log("   npm run test:coverage - 运行测试并生成覆盖率报告");
  process.exit(0);
}
