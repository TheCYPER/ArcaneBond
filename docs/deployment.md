# 免费部署

## 方案选择

生产环境使用 GitHub Pages。Arcane Bond 运行时只有 HTML、JavaScript、图片、音频和本地化 Phaser，没有账号、数据库或服务器 API。`tools/serve.py` 只是本地静态文件服务器，因此线上不需要为 Python 进程付费或维护休眠唤醒。

仓库为公开仓库时，GitHub Pages 可免费托管。目标地址是：

<https://thecyper.github.io/ArcaneBond/>

## 一次性启用

1. 打开 GitHub 仓库的 **Settings > Pages**。
2. 在 **Build and deployment** 的 Source 中选择 **GitHub Actions**。
3. 合并包含 `.github/workflows/deploy-pages.yml` 的 PR。

之后每次向 `main` 推送都会自动执行：

1. 使用 Node.js 运行 `npm run check`。
2. 只打包浏览器运行所需的 `index.html`、`assets/`、`src/` 和 `vendor/`。
3. 测试通过后部署到 GitHub Pages；测试失败时保留上一版线上游戏。

PR 只运行验证，不会覆盖线上版本。工作流也可以从 GitHub Actions 页面手动触发。

## 学校电脑

- 使用 Chrome、Edge 或 Firefox 打开线上地址即可，不需要安装软件。
- 两位玩家仍然需要共用一套物理键盘。
- 存档位于当前浏览器的 `localStorage`，换电脑或清理浏览器数据后不会自动同步。
- 游戏资产首次打开后由浏览器缓存；游戏本身不会向第三方服务发送运行时请求。

## 备用方案

如果学校网络屏蔽 `github.io`，可以把同一公开仓库连接到 Cloudflare Pages。选择无框架的静态站点配置，让它从仓库根目录发布；Cloudflare 会在 `main` 更新后自动重新部署，并提供独立的 `pages.dev` 地址。这个备用地址不会改变游戏代码或存档格式。
