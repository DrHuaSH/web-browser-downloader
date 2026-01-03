#!/bin/bash

echo "🚀 检查GitHub Pages部署状态..."
echo "📍 仓库: https://github.com/DrHuaSH/web-browser-downloader"
echo "🌐 网站: https://drhuash.github.io/web-browser-downloader"
echo ""

echo "📋 部署状态检查:"
echo ""

# 检查GitHub Actions状态
echo "1. 📊 GitHub Actions状态:"
echo "   访问: https://github.com/DrHuaSH/web-browser-downloader/actions"
echo "   查看最新的部署工作流是否成功"
echo ""

# 检查Pages设置
echo "2. ⚙️ GitHub Pages设置:"
echo "   访问: https://github.com/DrHuaSH/web-browser-downloader/settings/pages"
echo "   确认Source设置为'Deploy from a branch'"
echo "   确认Branch设置为'main' / '(root)'"
echo ""

# 检查网站可访问性
echo "3. 🌐 网站可访问性测试:"
if curl -s --head https://drhuash.github.io/web-browser-downloader | head -n 1 | grep -q "200 OK"; then
    echo "   ✅ 网站可以访问"
else
    echo "   ❌ 网站无法访问或返回错误"
fi
echo ""

# 检查最新提交
echo "4. 📝 最新提交信息:"
git log --oneline -3
echo ""

echo "⏱️ 部署通常需要1-5分钟时间"
echo "如果超过10分钟仍未更新，请检查GitHub Actions日志"
echo ""

echo "🔄 强制刷新建议:"
echo "1. 在浏览器中按 Ctrl+F5 (或 Cmd+Shift+R) 强制刷新"
echo "2. 清除浏览器缓存"
echo "3. 尝试无痕/隐私模式访问"
echo ""

echo "📱 测试建议:"
echo "访问网站后，尝试输入以下测试URL:"
echo "• https://httpbin.org"
echo "• https://www.example.com"
echo "• https://jsonplaceholder.typicode.com"
echo ""

echo "✅ 如果看到友好的错误页面而不是空白，说明修复已生效！"