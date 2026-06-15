# Eppen Tools · 开发者在线工具

纯前端开发者工具集合，所有处理在浏览器本地完成，不上传数据。

**在线访问：** https://tools.eppencn.com/

## 工具列表

- JSON 格式化 / 压缩 / 校验
- Base64 编解码（UTF-8）
- Unix 时间戳转换

## 本地预览

```bash
cd tools
python3 -m http.server 8766
```

访问 http://localhost:8766

## 部署（GitHub Pages）

推送到 `main` 分支后，GitHub Actions 自动部署。

### 首次配置

1. 在 GitHub 创建仓库 `eppen/tools` 并推送代码
2. **Settings → Pages → Source** 设为 **GitHub Actions**
3. **Custom domain** 填 `tools.eppencn.com`
4. Cloudflare DNS 添加记录：

| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| CNAME | `tools` | `eppen.github.io` | DNS only（灰云） |

5. DNS 生效后勾选 **Enforce HTTPS**

## AdSense

- 已预埋 `ads.txt` 与 meta 标签
- `js/ads-config.js` 中 `enabled: false`，审核通过并创建广告单元后再开启

## 相关站点

- 博客：https://eppencn.com/
- Minecraft 攻略：https://mcguidehub.eppencn.com/
