# 测试与检查流程文档

本文档描述所有与 LXHistory_Sync 扩展项目**本身功能无关**的测试、代码质量检查和 CI/CD 流程相关文件。

---

## 目录

1. [测试框架配置](#测试框架配置)
2. [代码质量工具配置](#代码质量工具配置)
3. [CI/CD 工作流](#cicd-工作流)
4. [SonarCloud 配置](#sonarcloud-配置)
5. [测试文件目录](#测试文件目录)

---

## 测试框架配置

### 1. Vitest 单元测试配置

**文件**: `vitest.config.ts`

**完整路径**: `d:\trea-cn\LXHistory_Sync\vitest.config.ts`

**作用**: 配置 Vitest 单元测试框架

**关键配置**:
- 测试环境: `happy-dom` (模拟浏览器环境)
- 测试文件匹配: `**/*.test.ts`
- 覆盖率报告目录: `coverage/`
- 测试设置文件: `vitest.setup.ts`

**与项目功能关系**: 仅用于测试，不影响扩展功能

---

### 2. Vitest 测试设置

**文件**: `vitest.setup.ts`

**完整路径**: `d:\trea-cn\LXHistory_Sync\vitest.setup.ts`

**作用**: 单元测试的全局设置和模拟

**内容**:
- 模拟 Chrome API (`chrome.storage`, `chrome.history`, `chrome.runtime`)
- 模拟 `crypto` 模块
- 全局测试钩子

**与项目功能关系**: 仅用于测试环境，生产环境不使用

---

### 3. Playwright E2E 测试配置

**文件**: `playwright.config.ts`

**完整路径**: `d:\trea-cn\LXHistory_Sync\playwright.config.ts`

**作用**: 配置 Playwright E2E 测试框架

**关键配置**:
- 测试目录: `./e2e`
- 报告输出:
  - CI 环境: `/tmp/playwright-report/` (系统临时目录)
  - 本地: `./playwright-report/`
- 浏览器配置: Chromium
- 重试策略: CI 环境重试 2 次

**与项目功能关系**: 仅用于端到端测试，不影响扩展功能

---

## 代码质量工具配置

### 4. ESLint 配置

**文件**: `eslint.config.mjs`

**完整路径**: `d:\trea-cn\LXHistory_Sync\eslint.config.mjs`

**作用**: JavaScript/TypeScript 代码质量和风格检查

**检查规则**:
- TypeScript 类型检查
- React Hooks 规则
- 未使用变量检测
- 代码复杂度限制
- 安全性检查 (如 `eval`, `innerHTML`)

**与项目功能关系**: 仅用于开发时代码检查，不影响扩展运行时

---

### 5. Prettier 配置

**文件**: `.prettierrc`

**完整路径**: `d:\trea-cn\LXHistory_Sync\.prettierrc`

**作用**: 代码格式化配置

**配置项**:
- 单引号
- 无分号
- 2 空格缩进
- 最大行宽 100
- 尾随逗号 `es5`

**与项目功能关系**: 仅用于代码风格统一，不影响扩展功能

---

### 6. Prettier 忽略配置

**文件**: `.prettierignore`

**完整路径**: `d:\trea-cn\LXHistory_Sync\.prettierignore`

**作用**: 指定哪些文件不应用 Prettier 格式化

**忽略项**:
- `node_modules/`
- `build/`
- `.plasmo/`
- `playwright-report/`
- `test-results/`
- 生成的类型定义文件

**与项目功能关系**: 仅影响格式化范围，不影响扩展功能

---

### 7. TypeScript 配置

**文件**: `tsconfig.json`

**完整路径**: `d:\trea-cn\LXHistory_Sync\tsconfig.json`

**作用**: TypeScript 编译器配置

**关键配置**:
- 严格类型检查
- JSX 支持
- 路径别名 (`~`, `~common`, `~components` 等)
- 输出目录: `./.plasmo/`

**与项目功能关系**: 仅用于编译时类型检查，不影响扩展运行时

---

## CI/CD 工作流

### 8. GitHub Actions 工作流

**文件**: `build-and-check.yml`

**完整路径**: `d:\trea-cn\LXHistory_Sync\.github\workflows\build-and-check.yml`

**作用**: 自动化构建、测试和发布流程

**包含任务**:
1. **build-and-check**: 代码检查、构建、安全扫描
2. **unit-test**: 运行 Vitest 单元测试
3. **e2e-test**: 运行 Playwright E2E 测试

**触发条件**:
- Push 到 main 分支
- Pull Request 到 main 分支
- 手动触发 (workflow_dispatch)

**与项目功能关系**: 仅用于持续集成，不影响扩展功能

---

## SonarCloud 配置

### 9. SonarCloud 项目配置

**文件**: `sonar-project.properties`

**完整路径**: `d:\trea-cn\LXHistory_Sync\sonar-project.properties`

**作用**: SonarCloud 代码质量分析配置

**配置项**:
- 项目 Key 和组织
- 排除目录 (node_modules, build, playwright-report 等)
- 测试文件排除
- TypeScript 配置路径

**与项目功能关系**: 仅用于代码质量分析，不影响扩展功能

---

## 测试文件目录

### 10. 单元测试目录

**目录**: `__tests__/`

**完整路径**: `d:\trea-cn\LXHistory_Sync\__tests__\`

**子目录结构**:
```
__tests__/
└── unit/
    ├── store.test.ts          (d:\trea-cn\LXHistory_Sync\__tests__\unit\store.test.ts)
    └── common/
        └── history.test.ts    (d:\trea-cn\LXHistory_Sync\__tests__\unit\common\history.test.ts)
```

**文件**:
- `__tests__/unit/store.test.ts` - 存储常量测试
- `__tests__/unit/common/history.test.ts` - 历史记录工具函数测试

**作用**: 验证工具函数和业务逻辑的正确性

**与项目功能关系**: 仅用于测试，不打包到扩展中

---

### 11. E2E 测试目录

**目录**: `e2e/`

**完整路径**: `d:\trea-cn\LXHistory_Sync\e2e\`

**子目录结构**:
```
e2e/
├── fixtures/
│   └── extension.ts         (d:\trea-cn\LXHistory_Sync\e2e\fixtures\extension.ts)
└── smoke.spec.ts            (d:\trea-cn\LXHistory_Sync\e2e\smoke.spec.ts)
```

**文件**:
- `e2e/smoke.spec.ts` - 构建产物冒烟测试
- `e2e/fixtures/extension.ts` - 扩展加载辅助函数

**作用**: 验证构建产物完整性和基本功能

**与项目功能关系**: 仅用于测试，不打包到扩展中

---

## 文件关联图

```
测试与检查流程
│
├── 单元测试
│   ├── vitest.config.ts ──────┐
│   ├── vitest.setup.ts ───────┤───> __tests__/unit/*.test.ts
│   └── tsconfig.json ─────────┘
│
├── E2E 测试
│   ├── playwright.config.ts ──┐
│   └── tsconfig.json ─────────┤───> e2e/*.spec.ts
│                              │
├── 代码质量检查               │
│   ├── eslint.config.mjs ─────┤
│   ├── .prettierrc ───────────┤
│   ├── .prettierignore ───────┤
│   └── sonar-project.properties
│                              │
└── CI/CD 流程                 │
    └── .github/workflows/     │
        └── build-and-check.yml┘
```

---

## 总结

以上所有文件和目录的共同特点:

1. **不参与扩展功能**: 这些文件仅用于开发、测试和部署流程
2. **不打包到扩展**: 构建时这些文件不会被包含在最终的 Chrome 扩展包中
3. **可独立移除**: 删除这些文件不会影响扩展的核心功能（但会失去测试和检查能力）
4. **开发环境专用**: 大部分配置仅在开发环境和 CI 环境中使用

---

## 维护建议

- 定期更新测试依赖版本
- 保持 CI 工作流与项目需求同步
- 根据代码变化调整 ESLint 规则
- 及时清理不再使用的测试文件
