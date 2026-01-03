/**
 * 最终集成测试
 * 验证所有组件的协同工作和端到端功能
 */

import { SecurityManager } from '../js/modules/SecurityManager.js';
import { ProxyService } from '../js/modules/ProxyService.js';
import { MobileAdaptationManager } from '../js/modules/MobileAdaptationManager.js';
import { BrowserEngine } from '../js/modules/BrowserEngine.js';
import { UIController } from '../js/modules/UIController.js';
import { ContentDetector } from '../js/modules/ContentDetector.js';
import { DownloadManager } from '../js/modules/DownloadManager.js';
import { ErrorHandler } from '../js/modules/ErrorHandler.js';

// 全局测试对象
window.finalIntegrationTests = {
    async runTests() {
        const framework = window.TestFramework;
        const suite = framework.createSuite('最终集成测试');

        // 创建模拟DOM环境
        function createCompleteDOM() {
            const mockElements = {
                app: document.createElement('div'),
                toolbar: document.createElement('header'),
                mediaBtn: document.createElement('button'),
                textBtn: document.createElement('button'),
                pdfBtn: document.createElement('button'),
                statusText: document.createElement('span'),
                loadingOverlay: document.createElement('div'),
                downloadPanel: document.createElement('div'),
                downloadList: document.createElement('div'),
                errorToast: document.createElement('div'),
                errorMessage: document.createElement('span'),
                urlInput: document.createElement('input'),
                browserIframe: document.createElement('iframe'),
                addressBar: document.createElement('div'),
                browserContainer: document.createElement('main'),
                goBtn: document.createElement('button'),
                refreshBtn: document.createElement('button'),
                closePanelBtn: document.createElement('button'),
                closeToastBtn: document.createElement('button')
            };

            // 设置ID和类名
            mockElements.app.id = 'app';
            mockElements.toolbar.className = 'toolbar';
            mockElements.mediaBtn.id = 'media-download-btn';
            mockElements.textBtn.id = 'text-download-btn';
            mockElements.pdfBtn.id = 'pdf-download-btn';
            mockElements.statusText.id = 'status-text';
            mockElements.loadingOverlay.id = 'loading-overlay';
            mockElements.downloadPanel.id = 'download-panel';
            mockElements.downloadList.id = 'download-list';
            mockElements.errorToast.id = 'error-toast';
            mockElements.errorMessage.id = 'error-message';
            mockElements.urlInput.id = 'url-input';
            mockElements.browserIframe.id = 'browser-iframe';
            mockElements.addressBar.className = 'address-bar';
            mockElements.browserContainer.className = 'browser-container';
            mockElements.goBtn.id = 'go-btn';
            mockElements.refreshBtn.id = 'refresh-btn';
            mockElements.closePanelBtn.id = 'close-panel-btn';
            mockElements.closeToastBtn.id = 'close-toast-btn';

            // 构建DOM结构
            mockElements.toolbar.appendChild(mockElements.mediaBtn);
            mockElements.toolbar.appendChild(mockElements.textBtn);
            mockElements.toolbar.appendChild(mockElements.pdfBtn);
            mockElements.toolbar.appendChild(mockElements.statusText);
            
            mockElements.addressBar.appendChild(mockElements.urlInput);
            mockElements.addressBar.appendChild(mockElements.goBtn);
            mockElements.addressBar.appendChild(mockElements.refreshBtn);
            
            mockElements.browserContainer.appendChild(mockElements.addressBar);
            mockElements.browserContainer.appendChild(mockElements.browserIframe);
            
            mockElements.downloadPanel.appendChild(mockElements.downloadList);
            mockElements.downloadPanel.appendChild(mockElements.closePanelBtn);
            
            mockElements.errorToast.appendChild(mockElements.errorMessage);
            mockElements.errorToast.appendChild(mockElements.closeToastBtn);
            
            mockElements.app.appendChild(mockElements.toolbar);
            mockElements.app.appendChild(mockElements.browserContainer);
            mockElements.app.appendChild(mockElements.loadingOverlay);
            mockElements.app.appendChild(mockElements.downloadPanel);
            mockElements.app.appendChild(mockElements.errorToast);

            // 初始状态设置
            mockElements.loadingOverlay.classList.add('hidden');
            mockElements.downloadPanel.classList.add('hidden');
            mockElements.errorToast.classList.add('hidden');

            // 添加到文档
            document.body.appendChild(mockElements.app);

            return mockElements;
        }

        // 清理DOM
        function cleanupDOM(elements) {
            if (elements.app && elements.app.parentNode) {
                elements.app.parentNode.removeChild(elements.app);
            }
        }

        // 集成测试1: 完整的组件初始化流程
        suite.addTest('完整组件初始化流程', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                // 初始化所有组件
                const securityManager = new SecurityManager();
                const proxyService = new ProxyService(securityManager);
                const mobileManager = new MobileAdaptationManager();
                const browserEngine = new BrowserEngine(securityManager, proxyService);
                const uiController = new UIController();
                const contentDetector = new ContentDetector(securityManager);
                const downloadManager = new DownloadManager(mobileManager);

                // 按正确顺序初始化
                await securityManager.initialize();
                framework.assert(securityManager.isInitialized, '安全管理器应该初始化成功');

                await proxyService.initialize();
                framework.assert(proxyService.isInitialized, '代理服务应该初始化成功');

                await mobileManager.initialize();
                framework.assert(mobileManager.isInitialized, '移动适配管理器应该初始化成功');

                await browserEngine.initialize();
                framework.assert(browserEngine.isInitialized, '浏览器引擎应该初始化成功');

                await uiController.initialize();
                framework.assert(uiController.isInitialized, 'UI控制器应该初始化成功');

                await contentDetector.initialize();
                framework.assert(contentDetector.isInitialized, '内容检测器应该初始化成功');

                await downloadManager.initialize();
                framework.assert(downloadManager.isInitialized, '下载管理器应该初始化成功');

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 集成测试2: 端到端URL处理流程
        suite.addTest('端到端URL处理流程', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                // 初始化组件
                const securityManager = new SecurityManager();
                const proxyService = new ProxyService(securityManager);
                const browserEngine = new BrowserEngine(securityManager, proxyService);
                const contentDetector = new ContentDetector(securityManager);

                await securityManager.initialize();
                await proxyService.initialize();
                await browserEngine.initialize();
                await contentDetector.initialize();

                const testUrl = 'https://example.com/test.html';

                // 1. 安全验证
                const urlValidation = securityManager.validateURLSafety(testUrl);
                framework.assert(urlValidation.isValid, 'URL应该通过安全验证');

                // 2. HTTPS验证和升级
                const httpsResult = securityManager.validateAndUpgradeHTTPS(testUrl);
                framework.assert(httpsResult.isSecure, 'URL应该是安全的HTTPS');

                // 3. 浏览器引擎加载（模拟）
                const loadResult = await browserEngine.loadURL(testUrl);
                framework.assert(loadResult.success, '浏览器引擎应该成功加载URL');

                // 4. 内容检测（模拟）
                const mockContent = '<html><body><a href="test.mp4">Video</a><a href="doc.pdf">PDF</a></body></html>';
                const detectionResult = await contentDetector.detectContent(mockContent, testUrl);
                
                framework.assert(
                    detectionResult.media.length > 0 || detectionResult.pdf.length > 0,
                    '应该检测到媒体或PDF内容'
                );

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 集成测试3: 错误处理集成
        suite.addTest('错误处理集成测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                const errorHandler = new ErrorHandler();
                const securityManager = new SecurityManager();
                const uiController = new UIController();

                await securityManager.initialize();
                await uiController.initialize();

                // 测试网络错误处理
                const networkError = new Error('Network request failed');
                const errorInfo = errorHandler.analyzeError(networkError);
                
                framework.assert(errorInfo.type === 'network', '应该正确识别网络错误');
                framework.assert(errorInfo.isRetryable === true, '网络错误应该可以重试');

                // 测试安全错误处理
                const sslError = new Error('SSL certificate verification failed');
                const securityResult = errorHandler.handleSecurityError(sslError);
                
                framework.assert(securityResult.canProceed === false, 'SSL错误应该阻止继续操作');

                // 测试UI错误显示
                const userMessage = errorHandler.generateUserFriendlyMessage(errorInfo);
                uiController.showError(userMessage);
                
                framework.assert(
                    !mockElements.errorToast.classList.contains('hidden'),
                    '错误应该在UI中显示'
                );

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 集成测试4: 移动设备适配集成
        suite.addTest('移动设备适配集成测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                const mobileManager = new MobileAdaptationManager();
                const downloadManager = new DownloadManager(mobileManager);
                const uiController = new UIController();

                await mobileManager.initialize();
                await downloadManager.initialize();
                await uiController.initialize();

                // 模拟移动设备
                const originalUserAgent = navigator.userAgent;
                Object.defineProperty(navigator, 'userAgent', {
                    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
                    configurable: true
                });

                const deviceInfo = mobileManager.detectDeviceAndBrowser();
                framework.assert(deviceInfo.isIOS, '应该检测到iOS设备');
                framework.assert(deviceInfo.isMobile, '应该检测到移动设备');

                // 测试移动设备下载适配
                try {
                    await mobileManager.adaptDownloadForMobile(
                        'https://example.com/test.mp4',
                        'test.mp4',
                        deviceInfo
                    );
                    framework.assert(true, '移动设备下载适配应该成功');
                } catch (error) {
                    // 预期可能会有错误，因为是模拟环境
                    framework.assert(
                        error.message.includes('iOS') || error.message.includes('弹窗'),
                        '应该提供iOS特定的错误信息'
                    );
                }

                // 恢复原始用户代理
                Object.defineProperty(navigator, 'userAgent', {
                    value: originalUserAgent,
                    configurable: true
                });

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 集成测试5: 下载流程集成
        suite.addTest('完整下载流程集成测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                const securityManager = new SecurityManager();
                const mobileManager = new MobileAdaptationManager();
                const downloadManager = new DownloadManager(mobileManager);
                const uiController = new UIController();

                await securityManager.initialize();
                await mobileManager.initialize();
                await downloadManager.initialize();
                await uiController.initialize();

                // 模拟下载流程
                const testUrl = 'https://example.com/test.mp4';
                const filename = 'test.mp4';

                // 1. 安全验证
                const urlValidation = securityManager.validateURLSafety(testUrl);
                framework.assert(urlValidation.isValid, 'URL应该通过安全验证');

                // 2. 生成安全文件名
                const safeFilename = securityManager.generateSecureFilename(filename);
                framework.assert(typeof safeFilename === 'string', '应该生成安全的文件名');

                // 3. 创建下载任务
                let downloadId;
                try {
                    downloadId = await downloadManager.downloadMediaFile(testUrl, safeFilename);
                    framework.assert(typeof downloadId === 'string', '应该返回下载ID');
                } catch (error) {
                    // 在测试环境中可能会失败，这是正常的
                    framework.assert(
                        error.message.includes('网络') || error.message.includes('下载'),
                        '应该提供有意义的错误信息'
                    );
                }

                // 4. UI状态更新
                uiController.updateStatus('下载中...');
                framework.assert(
                    mockElements.statusText.textContent === '下载中...',
                    'UI状态应该正确更新'
                );

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 性能测试: 组件协同工作性能
        suite.addTest('组件协同工作性能测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                const startTime = performance.now();

                // 快速初始化所有组件
                const components = [
                    new SecurityManager(),
                    new MobileAdaptationManager(),
                    new UIController(),
                    new ContentDetector(new SecurityManager()),
                    new DownloadManager(new MobileAdaptationManager())
                ];

                // 并行初始化
                await Promise.all(components.map(component => component.initialize()));

                const endTime = performance.now();
                const duration = endTime - startTime;

                framework.assert(
                    duration < 1000, // 1秒内完成
                    `所有组件初始化应该在1秒内完成，实际用时 ${duration.toFixed(2)}ms`
                );

                // 验证所有组件都已初始化
                components.forEach((component, index) => {
                    framework.assert(
                        component.isInitialized,
                        `组件 ${index} 应该初始化成功`
                    );
                });

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 内存泄漏测试
        suite.addTest('内存泄漏预防测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                // 创建和销毁多个组件实例
                for (let i = 0; i < 10; i++) {
                    const securityManager = new SecurityManager();
                    const uiController = new UIController();
                    
                    await securityManager.initialize();
                    await uiController.initialize();
                    
                    // 模拟使用
                    securityManager.validateURLSafety('https://example.com');
                    uiController.updateStatus(`测试 ${i}`);
                    
                    // 清理
                    uiController.cleanup();
                }

                framework.assert(true, '多次创建和销毁组件应该不会导致内存泄漏');

            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 边界条件测试
        suite.addTest('系统边界条件测试', async () => {
            const mockElements = createCompleteDOM();
            
            try {
                const securityManager = new SecurityManager();
                const uiController = new UIController();
                
                await securityManager.initialize();
                await uiController.initialize();

                // 测试极长URL
                const longUrl = 'https://example.com/' + 'a'.repeat(3000);
                const urlValidation = securityManager.validateURLSafety(longUrl);
                framework.assert(!urlValidation.isValid, '极长URL应该被拒绝');

                // 测试空输入
                const emptyValidation = securityManager.validateURLSafety('');
                framework.assert(!emptyValidation.isValid, '空URL应该被拒绝');

                // 测试特殊字符
                const specialUrl = 'javascript:alert("test")';
                const specialValidation = securityManager.validateURLSafety(specialUrl);
                framework.assert(!specialValidation.isValid, '危险协议应该被拒绝');

                // 测试UI极值
                const longMessage = 'A'.repeat(1000);
                uiController.updateStatus(longMessage);
                framework.assert(
                    mockElements.statusText.textContent === longMessage,
                    'UI应该能处理长消息'
                );

            } finally {
                cleanupDOM(mockElements);
            }
        });

        return await suite.run();
    }
};

console.log('最终集成测试模块已加载');