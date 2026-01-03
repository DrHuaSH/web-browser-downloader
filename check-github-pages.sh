#!/bin/bash

# GitHub Pages 部署状态检查脚本

echo "🚀 检查 GitHub Pages 部署状态..."
echo "📍 仓库: https://github.com/DrHuaSH/web-browser-downloader"
echo "🌐 预期地址: https://DrHuaSH.github.io/web-browser-downloader"
echo ""

echo "📋 接下来需要在GitHub上完成的步骤:"
echo ""
echo "1. 🔧 启用GitHub Pages:"
echo "   - 访问: https://github.com/DrHuaSH/web-browser-downloader/settings/pages"
echo "   - 在 'Source' 下选择 'Deploy from a branch'"
echo "   - Branch: 选择 'main'"
echo "   - Folder: 选择 '/ (root)'"
echo "   - 点击 'Save' 按钮"
echo ""
echo "2. ⏱️ 等待部署完成 (通常需要1-5分钟)"
echo ""
echo "3. ✅ 访问你的应用:"
echo "   https://DrHuaSH.github.io/web-browser-downloader"
echo ""

# 检查网络连接
echo "🔍 检查网络连接..."
if curl -s --head https://github.com > /dev/null; then
    echo "✅ GitHub连接正常"
else
    echo "❌ GitHub连接异常，请检查网络"
fi

echo ""
echo "📱 部署完成后，你的Web浏览器下载器将具备以下功能:"
echo "   🌐 完整浏览器界面"
echo "   🎵 音视频文件下载"
echo "   📝 网页文本提取"
echo "   📄 PDF文档下载"
echo "   📱 移动设备优化"
echo "   🔒 安全HTTPS传输"
echo ""
echo "🎊 恭喜！你的项目已成功推送到GitHub！"