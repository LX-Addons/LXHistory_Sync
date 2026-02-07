# LXHistory_Sync

LXHistory_Sync 是一个基于 Plasmo 框架开发的 Chrome 浏览器扩展，用于将浏览器历史记录同步到 WebDAV 服务器，实现跨设备历史记录同步功能。

## 功能特点

- ✅ 同步浏览器历史记录到 WebDAV 服务器
- ✅ 从 WebDAV 服务器同步历史记录到本地
- ✅ 自动合并本地和云端的历史记录
- ✅ 支持 WebDAV 服务器配置管理
- ✅ 详细的错误提示和状态反馈
- ✅ 美观的用户界面

## 安装方法

### 方法一：从源码构建

1. 克隆或下载本项目到本地
2. 安装依赖：
   ```bash
   npm install
   ```
3. 构建扩展：
   ```bash
   npm run build
   ```
4. 打开 Chrome 浏览器，进入 `chrome://extensions/`
5. 开启 "开发者模式"
6. 点击 "加载已解压的扩展程序"，选择 `build/chrome-mv3-prod` 目录

### 方法二：使用预构建的扩展包

1. 下载预构建的扩展包（如果提供）
2. 打开 Chrome 浏览器，进入 `chrome://extensions/`
3. 开启 "开发者模式"
4. 拖动扩展包文件到扩展管理页面

## 使用说明

### 1. 配置 WebDAV 服务器

1. 点击浏览器工具栏中的 LXHistory_Sync 图标
2. 点击 "选项" 按钮，进入配置页面
3. 填写 WebDAV 服务器地址、用户名和密码
4. 点击 "保存配置" 按钮

### 2. 同步历史记录

#### 同步到云端
1. 点击浏览器工具栏中的 LXHistory_Sync 图标
2. 点击 "同步到云端" 按钮
3. 等待同步完成，查看同步状态

#### 从云端同步
1. 点击浏览器工具栏中的 LXHistory_Sync 图标
2. 点击 "从云端同步" 按钮
3. 等待同步完成，查看同步状态

### 3. 查看历史记录

- 在扩展弹出窗口中，可以查看本地的历史记录
- 点击历史记录项，可以在新标签页中打开对应的网址

## 支持的 WebDAV 服务器

- 坚果云
- 阿里云盘
- OneDrive（需开启 WebDAV 支持）
- 自建 WebDAV 服务器（如 Nextcloud、ownCloud 等）

## 注意事项

1. **安全性**：WebDAV 密码会存储在浏览器本地存储中，请确保您的浏览器和设备安全
2. **网络连接**：同步操作需要稳定的网络连接
3. **服务器限制**：某些 WebDAV 服务器可能有存储空间或请求频率限制
4. **同步频率**：建议根据需要手动同步，避免过于频繁的同步操作
5. **数据大小**：默认最多同步 1000 条历史记录，以避免同步过程过于缓慢

## 故障排除

### 常见错误及解决方法

1. **WebDAV 配置未设置**：请进入选项页面设置 WebDAV 服务器信息
2. **无效的用户名或密码**：请检查 WebDAV 服务器的用户名和密码是否正确
3. **无法连接到 WebDAV 服务器**：请检查网络连接和 WebDAV 服务器地址是否正确
4. **没有权限访问 WebDAV 服务器**：请检查 WebDAV 服务器的权限设置
5. **WebDAV 服务器内部错误**：请联系 WebDAV 服务器管理员

### 日志查看

- 扩展的错误和操作日志会显示在浏览器的开发者工具控制台中
- 打开扩展弹出窗口，按 F12 键打开开发者工具，切换到 "控制台" 标签页查看日志

## 技术栈

- **前端框架**：React 18
- **开发框架**：Plasmo
- **语言**：TypeScript
- **样式**：CSS
- **状态管理**：React useState/useEffect
- **存储**：Chrome Storage API
- **同步协议**：WebDAV

## 项目结构

```
LXHistory_Sync/
├── assets/           # 资源文件
├── common/           # 通用功能
│   ├── history.ts    # 历史记录相关功能
│   ├── types.ts      # 类型定义
│   └── webdav.ts     # WebDAV 同步功能
├── components/       # 可重用组件
│   ├── HistoryItem.tsx   # 历史记录项组件
│   ├── SyncStatus.tsx    # 同步状态组件
│   └── ConfigForm.tsx    # 配置表单组件
├── background.ts     # 后台脚本
├── options.tsx       # 选项页面
├── popup.tsx         # 弹出页面
├── store.ts          # 状态和常量管理
├── style.css         # 样式文件
├── package.json      # 项目配置
└── tsconfig.json     # TypeScript 配置
```

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 许可证

本项目采用 MIT 许可证。详见 LICENSE 文件。

## 联系方式

如果您有任何问题或建议，欢迎通过以下方式联系我们：

- Issue 跟踪器：[项目 GitHub 仓库](https://github.com/yourusername/LXHistory_Sync/issues)

---

**注意**：本扩展仅用于个人数据备份和同步，请勿用于任何非法或不当用途。使用本扩展即表示您同意承担使用风险。