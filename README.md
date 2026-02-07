# LXHistory_Sync

> 基于 Plasmo 框架的 Chrome 浏览器历史记录同步工具，支持 WebDAV 协议，实现跨设备数据备份与恢复

---

## ✨ 核心特性

### 🔐 隐私优先
- 所有数据仅在本地和您的 WebDAV 服务器之间传输
- 支持多种端到端加密方式，确保数据安全
- 加密密钥仅存储在浏览器本地，不会上传到任何服务器

### 🔄 智能同步
- 双向同步：支持上传历史记录到云端，或从云端恢复到本地
- 自动合并：智能合并本地和云端的历史记录，避免数据冲突
- 灵活配置：默认同步最近 1000 条记录，可根据需求调整

### 🎨 个性化体验
- 主题切换：支持亮色/暗色/自动三种主题模式
- 域名分组：按域名组织历史记录，便于浏览
- 搜索功能：快速定位所需的历史记录
- 多样化图标：支持字节跳动、Google、百度、字母等多种图标源
- 自定义样式：多种复选框样式可选

### 🔒 强大加密
- **AES-256-GCM**：推荐使用，提供认证加密
- **AES-256-CBC**：经典加密方式
- **AES-256-CTR**：流加密方式
- **ChaCha20-Poly1305**：高性能加密方式

---

## 🚀 快速开始

### 安装扩展

#### 从源码构建

```bash
# 1. 克隆项目
git clone <repository-url>
cd LXHistory_Sync

# 2. 安装依赖
npm install

# 3. 构建扩展
npm run build

# 4. 加载到 Chrome
# 打开 chrome://extensions/
# 开启"开发者模式"
# 点击"加载已解压的扩展程序"，选择 build/chrome-mv3-prod 目录
```

#### 使用预构建包

下载预构建的扩展包，拖动到 `chrome://extensions/` 页面即可安装

---

## ⚠️ 重要提示

### 安全建议
- WebDAV 密码和加密密钥存储在浏览器本地，请确保设备安全
- 启用加密后，请妥善保管加密密钥，丢失将无法解密云端数据
- 建议使用强密码保护您的 WebDAV 账户

### 使用建议
- 同步操作需要稳定的网络连接
- 部分服务器可能有存储空间或请求频率限制
- 建议根据需要手动同步，避免过于频繁的操作
- 首次同步建议在稳定的网络环境下进行

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 |
| 开发框架 | Plasmo |
| 编程语言 | TypeScript |
| 样式方案 | CSS |
| 状态管理 | React Hooks (useState/useEffect) |
| 数据存储 | Chrome Storage API |
| 同步协议 | WebDAV |
| 加密方案 | Web Crypto API |

---

## 📁 项目结构

```
LXHistory_Sync/
├── assets/              # 资源文件
├── common/              # 通用功能模块
│   ├── history.ts       # 历史记录处理
│   ├── types.ts         # 类型定义
│   └── webdav.ts        # WebDAV 同步逻辑
├── components/          # React 组件
│   ├── HistoryItem.tsx  # 历史记录项
│   ├── SyncStatus.tsx   # 同步状态
│   └── ConfigForm.tsx   # 配置表单
├── background.ts        # 后台服务脚本
├── options.tsx          # 选项页面
├── popup.tsx            # 弹出窗口
├── store.ts             # 状态和常量管理
├── style.css            # 全局样式
├── package.json         # 项目配置
└── tsconfig.json        # TypeScript 配置
```

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)

---

## 📜 隐私声明

本扩展仅用于个人数据备份和同步，所有数据仅在您的设备和您指定的 WebDAV 服务器之间传输，不会收集或上传任何数据到第三方服务器。使用本扩展即表示您同意承担使用风险。

---

<div align="center">

**LXHistory_Sync** - 您的浏览器历史记录，安全掌控在自己手中

</div>
