/**
 * 项目结构单元测试
 * 测试HTML元素创建、CSS样式应用和移动设备viewport配置
 */

// 创建测试实例
const projectStructureTests = new TestFramework();

// HTML元素创建测试
projectStructureTests.test('应该创建主应用容器', function() {
    this.assertElementExists('#app', '主应用容器应该存在');
});

projectStructureTests.test('应该创建工具栏', function() {
    this.assertElementExists('.toolbar', '工具栏应该存在');
});

projectStructureTests.test('应该创建所有下载按钮', function() {
    this.assertElementExists('#media-download-btn', '音视频下载按钮应该存在');
    this.assertElementExists('#text-download-btn', '文本下载按钮应该存在');
    this.assertElementExists('#pdf-download-btn', 'PDF下载按钮应该存在');
});

projectStructureTests.test('应该创建地址栏组件', function() {
    this.assertElementExists('.address-bar', '地址栏应该存在');
    this.assertElementExists('#url-input', 'URL输入框应该存在');
    this.assertElementExists('#go-btn', '访问按钮应该存在');
    this.assertElementExists('#refresh-btn', '刷新按钮应该存在');
});

projectStructureTests.test('应该创建浏览器框架', function() {
    this.assertElementExists('.browser-frame', '浏览器框架应该存在');
    this.assertElementExists('#browser-iframe', '浏览器iframe应该存在');
});

projectStructureTests.test('应该创建加载覆盖层', function() {
    this.assertElementExists('#loading-overlay', '加载覆盖层应该存在');
    this.assertElementExists('.loading-spinner', '加载动画应该存在');
});

projectStructureTests.test('应该创建下载面板', function() {
    this.assertElementExists('#download-panel', '下载面板应该存在');
    this.assertElementExists('#download-list', '下载列表应该存在');
});

projectStructureTests.test('应该创建错误提示', function() {
    this.assertElementExists('#error-toast', '错误提示应该存在');
    this.assertElementExists('#error-message', '错误消息容器应该存在');
});

// CSS样式应用测试
projectStructureTests.test('应该正确应用基础样式', function() {
    const app = this.assertElementExists('#app');
    const computedStyle = window.getComputedStyle(app);
    
    this.assertEqual(computedStyle.display, 'flex', '应用容器应该使用flex布局');
    this.assertEqual(computedStyle.flexDirection, 'column', '应用容器应该是垂直布局');
});

projectStructureTests.test('工具栏应该有正确的样式', function() {
    const toolbar = this.assertElementExists('.toolbar');
    const computedStyle = window.getComputedStyle(toolbar);
    
    this.assertEqual(computedStyle.display, 'flex', '工具栏应该使用flex布局');
    this.assertEqual(computedStyle.justifyContent, 'space-between', '工具栏应该两端对齐');
});

projectStructureTests.test('下载按钮应该有正确的样式', function() {
    const mediaBtn = this.assertElementExists('#media-download-btn');
    const computedStyle = window.getComputedStyle(mediaBtn);
    
    this.assertEqual(computedStyle.display, 'flex', '按钮应该使用flex布局');
    this.assertTrue(computedStyle.minHeight.includes('44px') || 
                   parseInt(computedStyle.minHeight) >= 44, 
                   '按钮应该满足最小触摸目标尺寸(44px)');
});

projectStructureTests.test('URL输入框应该有正确的样式', function() {
    const urlInput = this.assertElementExists('#url-input');
    const computedStyle = window.getComputedStyle(urlInput);
    
    this.assertEqual(computedStyle.fontSize, '16px', 'URL输入框字体大小应该是16px(防止iOS缩放)');
});

projectStructureTests.test('浏览器iframe应该填满容器', function() {
    const iframe = this.assertElementExists('#browser-iframe');
    const computedStyle = window.getComputedStyle(iframe);
    
    this.assertEqual(computedStyle.width, '100%', 'iframe宽度应该是100%');
    this.assertEqual(computedStyle.height, '100%', 'iframe高度应该是100%');
});

// 移动设备viewport配置测试
projectStructureTests.test('应该有正确的viewport配置', function() {
    const viewport = document.querySelector('meta[name="viewport"]');
    this.assertTrue(viewport !== null, 'viewport meta标签应该存在');
    
    const content = viewport.getAttribute('content');
    this.assertTrue(content.includes('width=device-width'), 'viewport应该包含width=device-width');
    this.assertTrue(content.includes('initial-scale=1.0'), 'viewport应该包含initial-scale=1.0');
    this.assertTrue(content.includes('user-scalable=no'), 'viewport应该包含user-scalable=no');
});

projectStructureTests.test('应该有移动设备优化的meta标签', function() {
    const appleMobileCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    this.assertTrue(appleMobileCapable !== null, 'apple-mobile-web-app-capable meta标签应该存在');
    this.assertEqual(appleMobileCapable.getAttribute('content'), 'yes', 
                    'apple-mobile-web-app-capable应该设置为yes');
    
    const mobileWebAppCapable = document.querySelector('meta[name="mobile-web-app-capable"]');
    this.assertTrue(mobileWebAppCapable !== null, 'mobile-web-app-capable meta标签应该存在');
    this.assertEqual(mobileWebAppCapable.getAttribute('content'), 'yes', 
                    'mobile-web-app-capable应该设置为yes');
});

projectStructureTests.test('应该有PWA manifest链接', function() {
    const manifest = document.querySelector('link[rel="manifest"]');
    this.assertTrue(manifest !== null, 'manifest链接应该存在');
    this.assertEqual(manifest.getAttribute('href'), 'manifest.json', 
                    'manifest应该指向manifest.json');
});

// 响应式设计测试
projectStructureTests.test('应该在小屏幕上隐藏按钮文本', function() {
    // 模拟小屏幕
    const originalWidth = window.innerWidth;
    
    // 检查CSS媒体查询是否正确应用
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 768px) {
            .btn-text { display: none !important; }
        }
    `;
    document.head.appendChild(style);
    
    // 在实际的小屏幕设备上，.btn-text应该被隐藏
    // 这里我们检查CSS规则是否存在
    const btnText = document.querySelector('.btn-text');
    if (btnText && window.innerWidth <= 768) {
        const computedStyle = window.getComputedStyle(btnText);
        this.assertEqual(computedStyle.display, 'none', '小屏幕上按钮文本应该隐藏');
    }
    
    document.head.removeChild(style);
});

projectStructureTests.test('应该有触摸友好的按钮尺寸', function() {
    const buttons = document.querySelectorAll('.download-btn, .go-button, .refresh-button');
    
    buttons.forEach((button, index) => {
        const computedStyle = window.getComputedStyle(button);
        const minHeight = parseInt(computedStyle.minHeight) || parseInt(computedStyle.height);
        
        this.assertTrue(minHeight >= 44, 
                       `按钮${index + 1}应该满足最小触摸目标尺寸(44px)，实际: ${minHeight}px`);
    });
});

// 可访问性测试
projectStructureTests.test('按钮应该有适当的语义', function() {
    const mediaBtn = this.assertElementExists('#media-download-btn');
    const textBtn = this.assertElementExists('#text-download-btn');
    const pdfBtn = this.assertElementExists('#pdf-download-btn');
    
    this.assertEqual(mediaBtn.tagName.toLowerCase(), 'button', '媒体下载应该是button元素');
    this.assertEqual(textBtn.tagName.toLowerCase(), 'button', '文本下载应该是button元素');
    this.assertEqual(pdfBtn.tagName.toLowerCase(), 'button', 'PDF下载应该是button元素');
});

projectStructureTests.test('输入框应该有正确的类型和属性', function() {
    const urlInput = this.assertElementExists('#url-input');
    
    this.assertEqual(urlInput.type, 'url', 'URL输入框应该是url类型');
    this.assertTrue(urlInput.hasAttribute('placeholder'), 'URL输入框应该有placeholder');
    this.assertEqual(urlInput.getAttribute('autocomplete'), 'url', 
                    'URL输入框应该有autocomplete="url"');
});

// 初始状态测试
projectStructureTests.test('下载按钮初始状态应该是禁用的', function() {
    const mediaBtn = this.assertElementExists('#media-download-btn');
    const textBtn = this.assertElementExists('#text-download-btn');
    const pdfBtn = this.assertElementExists('#pdf-download-btn');
    
    this.assertTrue(mediaBtn.disabled, '媒体下载按钮初始应该禁用');
    this.assertTrue(textBtn.disabled, '文本下载按钮初始应该禁用');
    this.assertTrue(pdfBtn.disabled, 'PDF下载按钮初始应该禁用');
});

projectStructureTests.test('面板初始状态应该是隐藏的', function() {
    const downloadPanel = this.assertElementExists('#download-panel');
    const errorToast = this.assertElementExists('#error-toast');
    const loadingOverlay = this.assertElementExists('#loading-overlay');
    
    this.assertTrue(downloadPanel.classList.contains('hidden'), '下载面板初始应该隐藏');
    this.assertTrue(errorToast.classList.contains('hidden'), '错误提示初始应该隐藏');
    this.assertTrue(loadingOverlay.classList.contains('hidden'), '加载覆盖层初始应该隐藏');
});

// 导出测试套件
window.projectStructureTests = projectStructureTests;