<p align="center">
  <a href="https://trendshift.io/repositories/22585?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-22585" target="_blank" rel="noopener noreferrer">
    <img src="https://trendshift.io/api/badge/trendshift/repositories/22585/daily" alt="waooAI%2Fwaoowaoo | Trendshift" width="250" height="55"/>
  </a>
</p>

<p align="center">一款基于 AI 的图片与视频创作工作台：与右侧 Assistant 连续对话，在画布中上传、整理参考素材，生成并迭代作品。</p>

<p align="center"><a href="https://www.waoowaoo.com/">加入内测候补</a> · <a href="https://github.com/waooAI/waoowaoo/issues">反馈问题</a></p>

[English](README.md) · [简体中文](README_zh.md) · [日本語](README_ja.md) · [한국어](README_ko.md)

> [!IMPORTANT]
> ⚠️ **测试版声明**：本项目目前处于测试阶段，存在部分 bug 和不完善之处。我们正在快速迭代更新中，欢迎进群反馈问题和需求，及时关注项目更新！

微信公众号 / 社区交流

<img src="https://github.com/user-attachments/assets/0f4ff766-f059-4554-9193-caf34b081c7b" width="30%">

---

## ✨ 功能特性

waoowaoo 把对话、素材和生成结果放进同一个项目。你可以从一个创意开始，逐步制作角色设定图、品牌视觉或动画短片，无需先准备一整套小说或剧本。

- **用画布组织创作**：上传素材，查看图片与视频，在项目中整理和复用资源。
- **与 Assistant 连续协作**：描述目标，引用已有素材，让 Assistant 帮你生成或调整创作内容。
- **手动控制生成参数**：通过草稿卡选择模型支持的画幅、时长和其他可用参数。
- **用参考图保持方向**：按模型能力使用参考图片、首帧或首尾帧，衔接连续镜头。
- **继续加工结果**：预览生成内容，再制作新版本，或合并视频片段。

可用参数和参考方式取决于所选模型；并非每个模型都支持所有功能。

---

## 🚀 快速开始

推荐把下面的提示词复制给能访问本地终端的 AI 编程助手。它会根据你的系统和所选发布版本完成安装，你无需照着一长串命令手动操作。

```text
请帮我在本机安装 waoowaoo，公开仓库是：
https://github.com/waooAI/waoowaoo

先检查我的操作系统、Docker 环境，以及是否已有 waoowaoo 安装和数据。
阅读仓库的 docs/INSTALL.md 与准备安装的 Release 发布说明，使用同一发布版本的安装文件。
优先按照文档使用预构建 Docker 镜像，安装应用和配套 Codex runtime，
并准备文档要求的依赖；不要自行猜测镜像地址、标签、digest 或启动顺序。
若该版本没有可用的发布产物，请明确说明缺少什么，不要改用不明来源镜像。

为所需密钥生成独立的安全随机值，按文档配置关联项。
密钥只保存在本地必要的配置中，不要打印到对话、日志或提交到 Git。
保留已有配置和数据；不要覆盖已有安装、清空卷或删除文件。
发现现有安装时，先说明保留数据的升级方案，再进行需要我确认的操作。
需要操作系统权限或手动步骤时，说明用途并指导我完成。
使用同一发布版本的 docker/caddy/Caddyfile，让 Compose 默认启动 Caddy。
保留 SELF_HOSTED_HOST=localhost、SELF_HOSTED_HTTPS_PORT=1443，
APP_HOST_PORT=13000 只用于 HTTP 重定向；NEXTAUTH_URL 由 overlay 派生。
保留 Caddy 的 /data 和 /config 命名卷。只导出 root.crt，说明信任证书的影响，
取得我的明确批准后，协助导入浏览器所在宿主系统的信任库；Windows 与 WSL 的信任库不同。
不得导出 root.key 或跳过 TLS 校验。检查 https://localhost:1443 无证书警告，
并在浏览器中确认请求实际使用 h2，包括多标签页的事件流。
SSE 多标签页连接数量不等于 AI 任务并发额度。

完成后检查服务健康状态与网页是否可访问，告诉我访问地址和首次使用步骤。
指导我在网页配置自己的 OpenRouter API Key，不要要求我把密钥发到聊天里。
不要自动调用付费生成接口；如果安装受阻，给出具体原因和下一步。
```

发布版 Compose 默认随应用启动 Caddy。明确批准本地证书信任后，访问 **https://localhost:1443**；`13000` 端口只做 HTTP 重定向。源码开发 `npm run dev` 仍使用 `http://localhost:3001`。

详细部署与升级步骤见 [安装文档](docs/INSTALL.md)。升级时继续使用对应 Release 的说明，保留已有数据。

---

## 🔧 API 配置

当前可见的 API 服务商是 **OpenRouter**。对话、图片和视频调用可能产生 API 费用，由你的服务商账户承担；在本地运行应用不代表模型调用免费。

选择较短的视频和较低的可用规格，可以减少尝试成本。请在提交前检查所选模型、参数和费用提示，并关注 OpenRouter 账户余额。

应用界面目前支持**中文和英文**。README 提供中文、英文、日文和韩文版本；文档语言数量不代表界面语言数量。

---

## 📦 技术栈

- **Framework**: Next.js 16 + React 19
- **Database**: MySQL + Prisma ORM
- **Durable execution**: Temporal
- **Transport & cache**: Redis
- **Media storage**: Private MinIO (S3)
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js

---

## 📦 页面功能预览



---

## 🤝 参与方式

本项目由核心团队独立维护。欢迎你通过以下方式参与：

- 🐛 提交 [Issue](https://github.com/waooAI/waoowaoo/issues) 反馈 Bug
- 💡 提交 [Issue](https://github.com/waooAI/waoowaoo/issues) 提出功能建议
- 🔧 提交 Pull Request 供参考 — 我们会认真审阅每一个 PR 的思路，但最终由团队自行实现修复，不会直接合并外部 PR


---

## 许可证

从 v0.5.0-beta.1 起，本发行版采用 [Elastic License 2.0](LICENSE)。在遵守条款的前提下，允许个人使用、企业内部商用、修改和分发；向第三方提供本软件主要功能的托管或代管服务，需要另行取得授权。旧版本保留其原许可证，第三方组件保留各自许可。这是源码可用软件，不属于 OSI 定义的开源软件。

---

**Made with ❤️ by waoowaoo team**

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=saturndec/waoowaoo&type=date&legend=top-left)](https://www.star-history.com/#saturndec/waoowaoo&type=date&legend=top-left)
