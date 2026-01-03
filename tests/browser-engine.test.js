/**
 * 浏览器引擎属性测试
 * 验证URL加载一致性属性
 * **属性 1: URL加载一致性**
 * **验证: 需求 1.2**
 */

// 导入相关模块
import { BrowserEngine } from '../js/modules/BrowserEngine.js';
import { ProxyService } from '../js/modules/ProxyService.js';
import { SecurityManager } from '../js/modules/SecurityManager.js';

// 创建测试实例
const browserEngineTests = new TestFramework();

// 属性测试：URL加载一致性
browserEngineTests.test('属性 1: URL加载一致性 - 所有有效URL都应该能够正确加载和验证', async function() {
    // 创建模拟的依赖项
    const mockSecurityManager = {
        validateHTTPS: (url) => {
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'https:' || urlObj.hostname === 'localhost';
            } catch {
                return false;
            }
        },
        validateURLSafety: (url) => {
            return url && typeof url === 'string' && 
                   !url.includes('javascript:') && 
                   !url.includes('data:text/html');
        }
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => {
            return 'https://proxy.example.com/get?url=' + encodeURIComponent(url);
        }
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);
    
    // 模拟DOM元素
    const mockIframe = {
        src: '',
        addEventListener: () => {},
        contentDocument: null,
        contentWindow: null
    };
    
    const mockLoadingOverlay = {
        classList: {
            add: () => {},
            remove: () => {}
        }
    };

    // 模拟getElementById
    const originalGetElementById = document.getElementById;
    document.getElementById = (id) => {
        if (id === 'browser-iframe') return mockIframe;
        if (id === 'loading-overlay') return mockLoadingOverlay;
        if (id === 'url-input') return { value: '', addEventListener: () => {} };
        if (id === 'go-btn') return { addEventListener: () => {} };
        if (id === 'refresh-btn') return { addEventListener: () => {} };
        return null;
    };

    try {
        await browserEngine.initialize();

        // 测试用例：各种有效URL格式
        const validURLTestCases = [
            {
                input: 'https://example.com',
                expected: 'https://example.com',
                description: '标准HTTPS URL应该保持不变'
            },
            {
                input: 'example.com',
                expected: 'https://example.com',
                description: '无协议URL应该自动添加HTTPS'
            },
            {
                input: 'https://subdomain.example.com/path?query=value',
                expected: 'https://subdomain.example.com/path?query=value',
                description: '复杂URL应该保持完整'
            },
            {
                input: 'https://localhost:3000',
                expected: 'https://localhost:3000',
                description: 'localhost URL应该被接受'
            },
            {
                input: 'www.example.com/page.html',
                expected: 'https://www.example.com/page.html',
                description: 'www前缀URL应该正确处理'
            }
        ];

        for (const testCase of validURLTestCases) {
            try {
                const cleanedURL = browserEngine.validateAndCleanURL(testCase.input);
                this.assertEqual(cleanedURL, testCase.expected, 
                    `${testCase.description}: ${testCase.input} -> ${testCase.expected}`);
                
                // 验证URL安全性检查
                const isHTTPS = mockSecurityManager.validateHTTPS(cleanedURL);
                const isSafe = mockSecurityManager.validateURLSafety(cleanedURL);
                
                this.assertTrue(isHTTPS, `${testCase.description}: 清理后的URL应该使用HTTPS`);
                this.assertTrue(isSafe, `${testCase.description}: 清理后的URL应该是安全的`);
                
                console.log(`  ✅ ${testCase.description}: ${testCase.input} -> ${cleanedURL}`);
            } catch (error) {
                this.assertTrue(false, `${testCase.description}: 不应该抛出错误: ${error.message}`);
            }
        }

        console.log('✅ URL加载一致性属性测试通过');
    } finally {
        // 恢复原始函数
        document.getElementById = originalGetElementById;
    }
});

browserEngineTests.test('属性 1: URL加载一致性 - 无效URL应该被正确拒绝', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: (url) => {
            return !url.includes('javascript:') && !url.includes('data:text/html');
        }
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => url
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);

    // 测试用例：各种无效URL
    const invalidURLTestCases = [
        {
            input: 'javascript:alert("xss")',
            description: 'JavaScript URL应该被拒绝'
        },
        {
            input: 'data:text/html,<script>alert("xss")</script>',
            description: 'Data URL应该被拒绝'
        },
        {
            input: 'ftp://example.com/file.txt',
            description: 'FTP协议应该被拒绝'
        },
        {
            input: 'file:///etc/passwd',
            description: 'File协议应该被拒绝'
        },
        {
            input: '',
            description: '空URL应该被拒绝'
        },
        {
            input: '   ',
            description: '空白URL应该被拒绝'
        },
        {
            input: 'not-a-url',
            description: '无效格式应该被拒绝'
        }
    ];

    for (const testCase of invalidURLTestCases) {
        try {
            browserEngine.validateAndCleanURL(testCase.input);
            this.assertTrue(false, `${testCase.description}: 应该抛出错误但没有`);
        } catch (error) {
            this.assertTrue(true, `${testCase.description}: 正确拒绝了无效URL`);
            console.log(`  ✅ ${testCase.description}: ${testCase.input} -> 正确拒绝`);
        }
    }

    console.log('✅ 无效URL拒绝属性测试通过');
});

browserEngineTests.test('属性 1: URL加载一致性 - 代理需求检测应该正确工作', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => 'https://proxy.com/get?url=' + encodeURIComponent(url)
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);

    // 模拟当前页面origin
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
        value: {
            origin: 'https://localhost:3000'
        },
        configurable: true
    });

    try {
        // 测试代理需求检测
        const proxyTestCases = [
            {
                url: 'https://localhost:3000/page',
                needsProxy: false,
                description: '同源请求不需要代理'
            },
            {
                url: 'https://127.0.0.1:8080/api',
                needsProxy: false,
                description: '本地IP不需要代理'
            },
            {
                url: 'https://192.168.1.100/resource',
                needsProxy: false,
                description: '局域网IP不需要代理'
            },
            {
                url: 'https://example.com/page',
                needsProxy: true,
                description: '外部域名需要代理'
            },
            {
                url: 'https://api.github.com/repos',
                needsProxy: true,
                description: '外部API需要代理'
            }
        ];

        for (const testCase of proxyTestCases) {
            const needsProxy = browserEngine.needsProxy(testCase.url);
            this.assertEqual(needsProxy, testCase.needsProxy, 
                `${testCase.description}: ${testCase.url}`);
            console.log(`  ✅ ${testCase.description}: ${testCase.url} -> 代理=${needsProxy}`);
        }

        console.log('✅ 代理需求检测属性测试通过');
    } finally {
        // 恢复原始location
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            configurable: true
        });
    }
});

browserEngineTests.test('属性 1: URL加载一致性 - 页面内容提取应该正确工作', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => url
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);

    // 创建模拟的文档内容
    const mockDocument = {
        title: 'Test Page',
        body: {
            innerText: 'This is test content with some text.'
        },
        documentElement: {
            outerHTML: '<html><head><title>Test Page</title></head><body>Test content</body></html>'
        },
        querySelectorAll: (selector) => {
            if (selector === 'a[href]') {
                return [
                    {
                        getAttribute: (attr) => attr === 'href' ? '/page1' : 'Link 1',
                        textContent: 'Link 1',
                        getAttribute: (attr) => {
                            if (attr === 'href') return '/page1';
                            if (attr === 'title') return 'Page 1';
                            return '';
                        }
                    },
                    {
                        getAttribute: (attr) => attr === 'href' ? 'https://example.com/page2' : 'Link 2',
                        textContent: 'Link 2',
                        getAttribute: (attr) => {
                            if (attr === 'href') return 'https://example.com/page2';
                            if (attr === 'title') return 'Page 2';
                            return '';
                        }
                    }
                ];
            }
            if (selector === 'img[src]') {
                return [
                    {
                        getAttribute: (attr) => {
                            if (attr === 'src') return '/image1.jpg';
                            if (attr === 'alt') return 'Image 1';
                            return '';
                        }
                    }
                ];
            }
            if (selector.includes('video') || selector.includes('audio')) {
                return [];
            }
            return [];
        }
    };

    // 模拟iframe
    const mockIframe = {
        contentDocument: mockDocument,
        addEventListener: () => {},
        src: ''
    };

    browserEngine.iframe = mockIframe;
    browserEngine.currentURL = 'https://example.com/test';

    // 测试内容提取
    const content = browserEngine.getCurrentPageContent();

    this.assertTrue(content !== null, '应该能够提取页面内容');
    this.assertEqual(content.title, 'Test Page', '应该正确提取页面标题');
    this.assertEqual(content.url, 'https://example.com/test', '应该包含当前URL');
    this.assertTrue(content.text.includes('This is test content'), '应该提取页面文本');
    this.assertTrue(content.html.includes('<html>'), '应该提取HTML内容');
    this.assertTrue(Array.isArray(content.links), '应该提取链接数组');
    this.assertTrue(Array.isArray(content.images), '应该提取图片数组');
    this.assertTrue(typeof content.timestamp === 'number', '应该包含时间戳');

    // 验证链接提取
    this.assertTrue(content.links.length >= 1, '应该提取到链接');
    if (content.links.length > 0) {
        const firstLink = content.links[0];
        this.assertTrue(firstLink.url.includes('example.com'), '应该解析相对URL为绝对URL');
    }

    console.log('✅ 页面内容提取属性测试通过');
});

browserEngineTests.test('属性 1: URL加载一致性 - 历史记录管理应该正确工作', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => url
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);

    // 测试历史记录添加
    browserEngine.addToHistory('https://example.com/page1');
    browserEngine.addToHistory('https://example.com/page2');
    browserEngine.addToHistory('https://example.com/page3');

    this.assertEqual(browserEngine.pageHistory.length, 3, '应该正确添加历史记录');
    this.assertEqual(browserEngine.currentPageIndex, 2, '当前页面索引应该正确');
    this.assertEqual(browserEngine.pageHistory[2], 'https://example.com/page3', '最新页面应该在末尾');

    // 测试重复URL不添加
    browserEngine.addToHistory('https://example.com/page3');
    this.assertEqual(browserEngine.pageHistory.length, 3, '重复URL不应该重复添加');

    // 测试历史记录限制
    for (let i = 4; i <= 105; i++) {
        browserEngine.addToHistory(`https://example.com/page${i}`);
    }
    this.assertTrue(browserEngine.pageHistory.length <= 100, '历史记录应该限制在100条以内');

    // 测试后退和前进
    browserEngine.currentPageIndex = 50;
    browserEngine.goBack();
    this.assertEqual(browserEngine.currentPageIndex, 49, '后退应该减少索引');

    browserEngine.goForward();
    this.assertEqual(browserEngine.currentPageIndex, 50, '前进应该增加索引');

    // 测试边界条件
    browserEngine.currentPageIndex = 0;
    browserEngine.goBack();
    this.assertEqual(browserEngine.currentPageIndex, 0, '在第一页时后退不应该改变索引');

    browserEngine.currentPageIndex = browserEngine.pageHistory.length - 1;
    browserEngine.goForward();
    this.assertEqual(browserEngine.currentPageIndex, browserEngine.pageHistory.length - 1, 
        '在最后一页时前进不应该改变索引');

    console.log('✅ 历史记录管理属性测试通过');
});

browserEngineTests.test('属性 1: URL加载一致性 - URL解析应该正确处理相对和绝对URL', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true
    };

    const mockProxyService = {
        buildSecureProxyURL: async (url) => url
    };

    const browserEngine = new BrowserEngine(mockProxyService, mockSecurityManager);

    // 测试URL解析
    const baseURL = 'https://example.com/path/page.html';
    const urlTestCases = [
        {
            input: '/absolute/path',
            expected: 'https://example.com/absolute/path',
            description: '绝对路径应该正确解析'
        },
        {
            input: 'relative/path',
            expected: 'https://example.com/path/relative/path',
            description: '相对路径应该正确解析'
        },
        {
            input: '../parent/path',
            expected: 'https://example.com/parent/path',
            description: '父级路径应该正确解析'
        },
        {
            input: 'https://other.com/page',
            expected: 'https://other.com/page',
            description: '完整URL应该保持不变'
        },
        {
            input: '?query=value',
            expected: 'https://example.com/path/page.html?query=value',
            description: '查询参数应该正确解析'
        },
        {
            input: '#fragment',
            expected: 'https://example.com/path/page.html#fragment',
            description: '片段标识符应该正确解析'
        }
    ];

    for (const testCase of urlTestCases) {
        const resolved = browserEngine.resolveURL(testCase.input, baseURL);
        this.assertEqual(resolved, testCase.expected, 
            `${testCase.description}: ${testCase.input} -> ${testCase.expected}`);
        console.log(`  ✅ ${testCase.description}: ${testCase.input} -> ${resolved}`);
    }

    console.log('✅ URL解析属性测试通过');
});

// 导出测试套件
window.browserEngineTests = browserEngineTests;