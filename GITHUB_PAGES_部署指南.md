# GitHub Pages 部署指南

## 快速部署步骤

### 1. 准备Git配置
确保你已经配置了Git用户信息：
```bash
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的邮箱"
```

### 2. 运行部署脚本
```bash
./deploy-to-github.sh web-browser-downloader
```

### 3. 在GitHub创建仓库
1. 访问 https://github.com/new
2. 仓库名称：`web-browser-downloader`
3. 设为**公开仓库** (Public)
4. **不要**勾选初始化README、.gitignore或LICENSE
5. 点击 "Create repository"

### 4. 连接到GitHub仓库
在终端中运行（替换`你的用户名`）：
```bash
git remote add origin https://github.com/你的用户名/web-browser-downloader.git
git push -u origin main
```

### 5. 启用GitHub Pages
1. 进入你的GitHub仓库
2. 点击 **Settings** 标签
3. 在左侧菜单找到 **Pages**
4. 在 "Source" 下选择 **Deploy from a branch**
5. Branch 选择 **main**，文件夹选择 **/ (root)**
6. 点击 **Save**

### 6. 访问你的应用
几分钟后，你的应用将在以下地址可用：
```
https://你的用户名.github.io/web-browser-downloader
```

## 应用功能

你的Web浏览器下载器包含以下功能：

- 🌐 **完整浏览器界面** - 地址栏和浏览区域
- 🎵 **音视频下载** - 自动检测和下载媒体文件
- 📝 **文本提取** - 网页内容转Markdown下载
- 📄 **PDF下载** - 检测和下载PDF文档
- 🔒 **安全传输** - 强制HTTPS协议
- 📱 **移动适配** - 完美支持手机和平板

## 故障排除

### 如果部署失败
1. 检查仓库是否为公开仓库
2. 确认GitHub Pages设置正确
3. 等待几分钟让GitHub处理部署

### 如果应用无法正常工作
1. 检查浏览器控制台是否有错误
2. 确认所有文件都已正确上传
3. 尝试强制刷新页面 (Ctrl+F5 或 Cmd+Shift+R)

## 更新应用

要更新应用，只需：
```bash
git add .
git commit -m "更新描述"
git push
```

GitHub Pages会自动重新部署你的更改。