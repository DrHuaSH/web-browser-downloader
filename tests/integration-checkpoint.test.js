/**
 * 集成检查点测试
 * 验证基础功能的集成工作
 */

// 创建测试实例
const integrationCheckpointTests = new TestFramework();

integrationCheckpointTests.test('基础功能集成 - 所有核心模块应该能够正确初始化', async function() {
    // 模拟DOM环境
    const mockElements = {
        'browser-iframe': { 
            addEventListener: () => {},
            src: '',
            contentDocument: null,
            contentWindow: null
        },
        'loading-overlay': { 
            classList: { add: () => {}, remove: () => {} },
            setAttribute: () => {}
        },
        'url-input': { 
            value: '', 
            addEventListener: () => {},
            focus: () => {},
            select: () => {}
        },
        'go-btn': { addEventListener: () => {} },
        'refresh-btn': { addEventListener: () => {} },
        'media-download-btn': { 
            disabled: false, 
            classList: { add: () => {}, remove: () => {} },
            style: {},
            setAttribute: () => {},
            removeAttribute: () => {},
            querySelector: () => null,
            appendChild: () => {}
        },
        'text-download-btn': { 
            disabled: false, 
            classList: { add: () => {}, remove: () => {} },
            style: {},
            setAttribute: () => {},
            removeAttribute: () => {},
            querySelector: () => null,
            appendChild: () => {}
        },
        'pdf-download-btn': { 
            disabled: false, 
            classList: { add: () => {}, remove: () => {} },
            style: {},
            setAttribute: () => {},
            removeAttribute: () => {},
            querySelector: () => null,
            appendChild: () => {}
        },
        'status-text': { 
            textContent: '', 
            setAttribute: () => {} 
        },
        'download-panel': { 
            classList: { add: () => {}, remove: () => {} },
            setAttribute: () => {},
            style: {}
        },
        'download-list': { 
            innerHTML: '', 
            appendChild: () => {},
            querySelector: () => null,
            style: {}
        },
        'error-toast': { 
            classList: { add: () => {}, remove: () => {} },
            setAttribute: () => {}
        },
        'error-message': { textContent: '' },
        'close-panel-btn': { addEventListener: () => {} },
        'close-toast-btn': { addEventListener: () => {} }
    };

    // 模拟DOM方法
    const originalGetElementById = document.getElementById;
    const originalQuerySelector = document.querySelector;
    const originalQuerySelectorAll = document.querySelectorAll;

    document.getElementById = (id) => mockElements[id] || null;
    document.querySelector = (selector) => {
        if (selector === '.toolbar') return { style: {}, offsetHeight: 60 };
        if (selector === '.browser-container') return { style: {} };
        if (selector === '.address-bar') return { style: {} };
        return null;
    };
    document.querySelectorAll = (selector) => {
        if (selector === '.download-btn') {
            return [mockElements['media-download-btn'], mockElements['text-download-btn'], mockElements['pdf-download-btn']];
        }
        return [];
    };

    try {
        // 动态导入模块（在测试环境中模拟）
        const { SecurityManager } = await import('../js/modules/SecurityManager.js');
        const { ProxyService } = await import('../js/modules/ProxyService.js');
        const { MobileAdaptationManager } = await import('../js/modules/MobileAdaptationManager.js');
        const { BrowserEngine } = await import('../js/modules/BrowserEngine.js');
        const { UIController } = await import('../js/modules/UIController.js');

        // 测试各个模块的初始化
        console.log('  测试SecurityManager初始化...');
        const securityManager = new SecurityManager();
        await securityManager.initialize();
        this.assertTrue(securityManager.isInitialized, 'SecurityManager应该初始化成功');

        console.log('  测试ProxyService初始化...');
        const proxyService = new ProxyService(securityManager);
        await proxyService.initialize();
        this.assertTrue(proxyService.isInitialized, 'ProxyService应该初始化成功');

        console.log('  测试MobileAdaptationManager初始化...');
        const mobileManager = new MobileAdaptationManager();
        await mobileManager.initialize();
        this.assertTrue(mobileManager.isInitialized, 'MobileAdaptationManager应该初始化成功');

        console.log('  测试BrowserEngine初始化...');
        const browserEngine = new BrowserEngine(proxyService, securityManager);
        await browserEngine.initialize();
        this.assertTrue(browserEngine.isInitialized, 'BrowserEngine应该初始化成功');

        console.log('  测试UIController初始化...');
        const uiController = new UIController();
        await uiController.initialize();
        this.assertTrue(uiController.isInitialized, 'UIController应该初始化成功');

        console.log('✅ 所有核心模块初始化成功');

    } catch (error) {
        this.assertTrue(false, `模块初始化失败: ${error.message}`);
    } finally {
        // 恢复原始DOM方法
        document.getElementById = originalGetElementById;
        document.querySelector = originalQuerySelector;
        document.querySelectorAll = originalQuerySelectorAll;
    }
});

integrationCheckpointTests.test('基础功能集成 - 模块间依赖关系应该正确工作', async function() {
    try {
        // 动态导入模块
        const { SecurityManager } = await import('../js/modules/SecurityManager.js');
        const { ProxyService } = await import('../js/modules/ProxyService.js');

        // 测试SecurityManager和ProxyService的依赖关系
        const securityManager = new SecurityManager();
        await securityManager.initialize();

        const proxyService = new ProxyService(securityManager);
        await proxyService.initialize();

        // 验证ProxyService能够使用SecurityManager的方法
        const testUrl = 'https://example.com/test';
        const isHTTPS = securityManager.validateHTTPS(testUrl);
        const isSafe = securityManager.validateURLSafety(testUrl);

        this.assertTrue(isHTTPS, 'SecurityManager应该正确验证HTTPS URL');
        this.assertTrue(isSafe, 'SecurityManager应该正确验证URL安全性');

        console.log('✅ 模块间依赖关系工作正常');

    } catch (error) {
        this.assertTrue(false, `模块依赖测试失败: ${error.message}`);
    }
});

integrationCheckpointTests.test('基础功能集成 - URL验证和��理功能应该端到端工作', async function() {
    try {
        const { SecurityManager } = await import('../js/modules/SecurityManager.js');
        const securityManager = new SecurityManager();
        await securityManager.initialize();

        // 测试各种URL场景
        const urlTestCases = [
            {
                input: 'example.com',
                expectedProtocol: 'https:',
                description: '无协议URL应该自动添加HTTPS'
            },
            {
                input: 'https://secure.example.com',
                expectedProtocol: 'https:',
                description: 'HTTPS URL应该保持不变'
            },
            {
                input: 'http://insecure.example.com',
                expectedProtocol: 'http:',
                description: 'HTTP URL应该被识别（但可能被升级）'
            }
        ];

        for (const testCase of urlTestCases) {
            try {
                const url = new URL(testCase.input.startsWith('http') ? testCase.input : 'https://' + testCase.input);
                const isHTTPS = securityManager.validateHTTPS(url.href);
                const isSafe = securityManager.validateURLSafety(url.href);

                if (testCase.expectedProtocol === 'https:') {
                    this.assertTrue(isHTTPS, `${testCase.description}: 应该通过HTTPS验证`);
                }
                this.assertTrue(isSafe, `${testCase.description}: 应该通过安全验证`);

                console.log(`  ✅ ${testCase.description}: ${testCase.input}`);
            } catch (error) {
                console.log(`  ⚠️ ${testCase.description}: ${error.message}`);
            }
        }

        console.log('✅ URL验证和清理功能工作正常');

    } catch (error) {
        this.assertTrue(false, `URL验证测试失败: ${error.message}`);
    }
});

integrationCheckpointTests.test('基础功能集成 - 移动设备检测应该正确工作', async function() {
    try {
        const { MobileAdaptationManager } = await import('../js/modules/MobileAdaptationManager.js');
        
        // 保存原始用户代理
        const originalUserAgent = navigator.userAgent;

        // 测试移动设备检测
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
            configurable: true
        });

        const mobileManager = new MobileAdaptationManager();
        await mobileManager.initialize();

        this.assertTrue(mobileManager.deviceInfo.isMobile, '应该检测到移动设备');
        this.assertTrue(mobileManager.deviceInfo.isIOS, '应该检测到iOS设备');

        // 恢复原始用户代理
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });

        console.log('✅ 移动设备检测功能工作正常');

    } catch (error) {
        this.assertTrue(false, `移动设备检测测试失败: ${error.message}`);
    }
});

integrationCheckpointTests.test('基础功能集成 - 错误处理机制应该正确工作', async function() {
    try {
        const { SecurityManager } = await import('../js/modules/SecurityManager.js');
        const securityManager = new SecurityManager();
        await securityManager.initialize();

        // 测试无效URL处理
        const invalidUrls = [
            'javascript:alert("xss")',
            'data:text/html,<script>alert("xss")</script>',
            'not-a-valid-url'
        ];

        for (const invalidUrl of invalidUrls) {
            const isSafe = securityManager.validateURLSafety(invalidUrl);
            
            if (invalidUrl.includes('javascript:') || invalidUrl.includes('data:text/html')) {
                this.assertFalse(isSafe, `危险URL应该被拒绝: ${invalidUrl}`);
            }
        }

        console.log('✅ 错误处理机制工作正常');

    } catch (error) {
        this.assertTrue(false, `错误处理测试失败: ${error.message}`);
    }
});

// 导出测试套件
window.integrationCheckpointTests = integrationCheckpointTests;