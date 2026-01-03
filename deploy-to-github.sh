#!/bin/bash

# Web浏览器下载器 - GitHub Pages 部署脚本
# 使用方法: ./deploy-to-github.sh <仓库名称>

set -e

# 检查参数
if [ $# -eq 0 ]; then
    echo "❌ 错误: 请提供仓库名称"
    echo "使用方法: ./deploy-to-github.sh <仓库名称>"
    echo "例如: ./deploy-to-github.sh web-browser-downloader"
    exit 1
fi

REPO_NAME=$1
GITHUB_USERNAME=$(git config user.name 2>/dev/null || echo "")

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ 错误: 未找到Git用户名配置"
    echo "请先配置Git用户信息:"
    echo "git config --global user.name \"你的GitHub用户名\""
    echo "git config --global user.email \"你的邮箱\""
    exit 1
fi

echo "🚀 开始部署 Web浏览器下载器 到 GitHub Pages..."
echo "📦 仓库名称: $REPO_NAME"
echo "👤 GitHub用户: $GITHUB_USERNAME"
echo ""

# 添加所有文件到Git
echo "📁 添加文件到Git仓库..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "Initial commit: Web浏览器下载器

- 完整的浏览器界面和功能
- 音视频、PDF、文本内容下载
- 移动设备优化
- 安全传输和错误处理
- 准备部署到GitHub Pages"

# 设置主分支
echo "🌿 设置主分支..."
git branch -M main

echo ""
echo "✅ 本地Git仓库准备完成!"
echo ""
echo "📋 接下来的步骤:"
echo "1. 在GitHub上创建新仓库: https://github.com/new"
echo "   - 仓库名称: $REPO_NAME"
echo "   - 设为公开仓库 (Public)"
echo "   - 不要初始化README、.gitignore或LICENSE"
echo ""
echo "2. 创建仓库后，运行以下命令连接到GitHub:"
echo "   git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "3. 在GitHub仓库设置中启用GitHub Pages:"
echo "   - 进入仓库 Settings > Pages"
echo "   - Source: Deploy from a branch"
echo "   - Branch: main / (root)"
echo "   - 点击Save"
echo ""
echo "4. 几分钟后访问你的应用:"
echo "   https://$GITHUB_USERNAME.github.io/$REPO_NAME"
echo ""
echo "🎉 部署完成后，你就可以使用Web浏览器下载器了!"