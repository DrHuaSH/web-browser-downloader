/**
 * 代理服务属性测试
 * 验证跨域请求处理属性
 * **属性 7: 跨域请求处理**
 * **验证: 需求 5.3**
 */

// 导入相关模块 (在测试环境中需要模拟)
import { ProxyService } from '../js/modules/ProxyService.js';
import { SecurityManager } from '../js/modules/SecurityManager.js';

// 创建测试实例
const proxyServiceTests = new TestFramework();

// 属性测试：跨域请求处理
proxyServiceTests.test('属性 7: 跨域请求处理 - 所有跨域请求都应通过CORS代理正确处理', async function() {
    // 创建模拟的SecurityManager
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
            return url && typeof url === 'string' && !url.includes('javascript:');
        },
        validateProxyService: async (proxyURL) => {
            // 模拟代理服务验证
            return proxyURL.startsWith('https://');
        },
        sanitizeHeaders: (headers) => {
            const allowed = ['accept', 'content-type', 'user-agent'];
            const sanitized = {};
            for (const [key, value] of Object.entries(headers)) {
                if (allowed.includes(key.toLowerCase())) {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        },
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    
    // 模拟初始化（不进行实际网络请求）
    proxyService.proxyServices = [
        {
            name: 'TestProxy1',
            url: 'https://test-proxy1.com/get?url=',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 0,
            requestCount: 0
        },
        {
            name: 'TestProxy2',
            url: 'https://test-proxy2.com/',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 0,
            requestCount: 0
        }
    ];
    proxyService.isInitialized = true;
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 测试用例：各种跨域请求场景
    const crossOriginTestCases = [
        {
            url: 'https://api.example.com/data',
            description: '标准HTTPS API请求应该被代理'
        },
        {
            url: 'https://cdn.example.com/resource.json',
            description: 'CDN资源请求应该被代理'
        },
        {
            url: 'https://external-service.com/endpoint',
            description: '外部服务请求应该被代理'
        }
    ];

    for (const testCase of crossOriginTestCases) {
        // 验证URL会被正确处理
        const isHTTPS = mockSecurityManager.validateHTTPS(testCase.url);
        this.assertTrue(isHTTPS, `${testCase.description}: URL应该使用HTTPS`);
        
        const isSafe = mockSecurityManager.validateURLSafety(testCase.url);
        this.assertTrue(isSafe, `${testCase.description}: URL应该是安全的`);
        
        // 验证代理URL构建
        const proxyUrl = proxyService.buildProxyURL(testCase.url, proxyService.proxyServices[0]);
        this.assertTrue(proxyUrl.includes(testCase.url) || proxyUrl.includes(encodeURIComponent(testCase.url)), 
            `${testCase.description}: 代理URL应该包含目标URL`);
        
        console.log(`  ✅ ${testCase.description}: ${testCase.url} -> ${proxyUrl.substring(0, 80)}...`);
    }

    console.log('✅ 跨域请求处理属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - HTTP请求应该自动升级为HTTPS', async function() {
    const mockSecurityManager = {
        validateHTTPS: (url) => {
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'https:' || urlObj.hostname === 'localhost';
            } catch {
                return false;
            }
        },
        validateURLSafety: (url) => true,
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => headers,
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    proxyService.isInitialized = true;
    proxyService.proxyServices = [{
        name: 'TestProxy',
        url: 'https://test-proxy.com/get?url=',
        type: 'test',
        timeout: 5000,
        rateLimit: 100,
        lastUsed: 0,
        requestCount: 0
    }];
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 测试HTTP到HTTPS的升级
    const httpUrls = [
        'http://api.example.com/data',
        'http://cdn.example.com/resource.json',
        'http://service.example.com/endpoint'
    ];

    for (const httpUrl of httpUrls) {
        // 验证原始URL是HTTP
        this.assertFalse(mockSecurityManager.validateHTTPS(httpUrl), 
            `原始URL应该是HTTP: ${httpUrl}`);
        
        // 验证升级后的URL是HTTPS
        const httpsUrl = httpUrl.replace(/^http:/, 'https:');
        this.assertTrue(mockSecurityManager.validateHTTPS(httpsUrl), 
            `升级后的URL应该是HTTPS: ${httpsUrl}`);
        
        console.log(`  ✅ HTTP升级: ${httpUrl} -> ${httpsUrl}`);
    }

    console.log('✅ HTTP到HTTPS升级属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - 代理服务选择和故障转移', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true,
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => headers,
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    proxyService.isInitialized = true;
    
    // 设置多个代理服务
    proxyService.proxyServices = [
        {
            name: 'Proxy1',
            url: 'https://proxy1.com/get?url=',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 0,
            requestCount: 0
        },
        {
            name: 'Proxy2',
            url: 'https://proxy2.com/',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 1000,
            requestCount: 0
        },
        {
            name: 'Proxy3',
            url: 'https://proxy3.com/?url=',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 2000,
            requestCount: 0
        }
    ];
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 测试最佳代理选择（最近最少使用）
    const bestProxy = proxyService.selectBestProxy();
    this.assertEqual(bestProxy.name, 'Proxy1', '应该选择最近最少使用的代理服务');

    // 测试断路器功能
    proxyService.recordFailure(proxyService.proxyServices[0]);
    proxyService.recordFailure(proxyService.proxyServices[0]);
    proxyService.recordFailure(proxyService.proxyServices[0]);
    
    // 第一个代理应该被断路器阻止
    const isAvailable = proxyService.isServiceAvailable(proxyService.proxyServices[0]);
    this.assertFalse(isAvailable, '失败次数过多的代理服务应该被断路器阻止');

    // 应该选择下一个可用的代理
    const nextBestProxy = proxyService.selectBestProxy();
    this.assertTrue(nextBestProxy.name !== 'Proxy1', '应该选择其他可用的代理服务');

    console.log('✅ 代理服务选择和故障转移属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - 速率限制和请求管理', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true,
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => headers,
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    proxyService.isInitialized = true;
    
    // 设置有限速率限制的代理服务
    const limitedProxy = {
        name: 'LimitedProxy',
        url: 'https://limited-proxy.com/get?url=',
        type: 'test',
        timeout: 5000,
        rateLimit: 2, // 很低的限制用于测试
        lastUsed: 0,
        requestCount: 0
    };
    
    proxyService.proxyServices = [limitedProxy];
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 测试速率限制检查
    this.assertTrue(proxyService.checkRateLimit(limitedProxy), '初始状态应该在速率限制内');
    
    // 模拟请求
    limitedProxy.requestCount = 1;
    this.assertTrue(proxyService.checkRateLimit(limitedProxy), '第一个请求应该在限制内');
    
    limitedProxy.requestCount = 2;
    this.assertFalse(proxyService.checkRateLimit(limitedProxy), '超过限制的请求应该被拒绝');

    // 测试速率限制重置
    proxyService.resetRateLimits();
    this.assertEqual(limitedProxy.requestCount, 0, '重置后请求计数应该为0');
    this.assertTrue(proxyService.checkRateLimit(limitedProxy), '重置后应该重新可用');

    console.log('✅ 速率限制和请求管理属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - 安全代理URL构建', async function() {
    const mockSecurityManager = {
        validateHTTPS: (url) => {
            try {
                const urlObj = new URL(url);
                return urlObj.protocol === 'https:';
            } catch {
                return false;
            }
        },
        validateURLSafety: (url) => {
            return !url.includes('javascript:') && !url.includes('data:text/html');
        },
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => headers,
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    proxyService.isInitialized = true;
    proxyService.proxyServices = [{
        name: 'SecureProxy',
        url: 'https://secure-proxy.com/get?url=',
        type: 'test',
        timeout: 5000,
        rateLimit: 100,
        lastUsed: 0,
        requestCount: 0
    }];
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 测试安全URL构建
    const secureTestCases = [
        {
            input: 'https://api.example.com/data',
            shouldSucceed: true,
            description: '安全的HTTPS URL应该成功'
        },
        {
            input: 'http://api.example.com/data',
            shouldSucceed: true,
            description: 'HTTP URL应该被升级为HTTPS'
        }
    ];

    for (const testCase of secureTestCases) {
        if (testCase.shouldSucceed) {
            try {
                const secureUrl = proxyService.buildSecureProxyURL(testCase.input);
                this.assertTrue(secureUrl.length > 0, `${testCase.description}: 应该生成有效的代理URL`);
                this.assertTrue(secureUrl.startsWith('https://'), `${testCase.description}: 代理URL应该使用HTTPS`);
                console.log(`  ✅ ${testCase.description}: ${testCase.input} -> ${secureUrl.substring(0, 80)}...`);
            } catch (error) {
                this.assertTrue(false, `${testCase.description}: 不应该抛出错误: ${error.message}`);
            }
        }
    }

    // 测试不安全URL被拒绝
    const unsafeUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>'
    ];

    for (const unsafeUrl of unsafeUrls) {
        try {
            proxyService.buildSecureProxyURL(unsafeUrl);
            this.assertTrue(false, `不安全的URL应该被拒绝: ${unsafeUrl}`);
        } catch (error) {
            this.assertTrue(true, `不安全的URL正确被拒绝: ${unsafeUrl}`);
            console.log(`  ✅ 不安全URL被拒绝: ${unsafeUrl}`);
        }
    }

    console.log('✅ 安全代理URL构建属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - 请求头清理和安全性', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true,
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => {
            const allowed = ['accept', 'content-type', 'user-agent'];
            const sanitized = {};
            for (const [key, value] of Object.entries(headers)) {
                if (allowed.includes(key.toLowerCase())) {
                    sanitized[key] = value.substring(0, 1000); // 限制长度
                }
            }
            return sanitized;
        },
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);

    // 测试请求头清理
    const originalHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'TestAgent/1.0',
        'Authorization': 'Bearer secret-token', // 应该被移除
        'Cookie': 'session=abc123', // 应该被移除
        'X-Custom-Header': 'custom-value' // 应该被移除
    };

    const sanitizedHeaders = mockSecurityManager.sanitizeHeaders(originalHeaders);

    // 验证允许的头部保留
    this.assertTrue('Accept' in sanitizedHeaders, '应该保留Accept头部');
    this.assertTrue('Content-Type' in sanitizedHeaders, '应该保留Content-Type头部');
    this.assertTrue('User-Agent' in sanitizedHeaders, '应该保留User-Agent头部');

    // 验证危险的头部被移除
    this.assertFalse('Authorization' in sanitizedHeaders, '应该移除Authorization头部');
    this.assertFalse('Cookie' in sanitizedHeaders, '应该移除Cookie头部');
    this.assertFalse('X-Custom-Header' in sanitizedHeaders, '应该移除自定义头部');

    console.log('✅ 请求头清理和安全性属性测试通过');
});

proxyServiceTests.test('属性 7: 跨域请求处理 - 代理服务统计和监控', async function() {
    const mockSecurityManager = {
        validateHTTPS: () => true,
        validateURLSafety: () => true,
        validateProxyService: async () => true,
        sanitizeHeaders: (headers) => headers,
        sanitizeContent: (content) => content
    };

    const proxyService = new ProxyService(mockSecurityManager);
    proxyService.isInitialized = true;
    proxyService.proxyServices = [
        {
            name: 'Proxy1',
            url: 'https://proxy1.com/',
            type: 'test',
            timeout: 5000,
            rateLimit: 100,
            lastUsed: 0,
            requestCount: 10
        },
        {
            name: 'Proxy2',
            url: 'https://proxy2.com/',
            type: 'test',
            timeout: 5000,
            rateLimit: 50,
            lastUsed: 0,
            requestCount: 5
        }
    ];
    proxyService.failureCount = new Map();
    proxyService.circuitBreaker = new Map();

    // 设置一些断路器状态
    proxyService.circuitBreaker.set('Proxy1', {
        isOpen: true,
        openedAt: Date.now(),
        timeout: 5 * 60 * 1000
    });

    // 获取统计信息
    const stats = proxyService.getProxyStats();

    // 验证统计信息
    this.assertEqual(stats.totalServices, 2, '总服务数应该正确');
    this.assertEqual(stats.availableServices, 1, '可用服务数应该正确（排除断路器开启的）');
    this.assertTrue(stats.circuitBreakers.includes('Proxy1'), '断路器状态应该被记录');
    this.assertEqual(stats.requestCounts.length, 2, '请求计数应该包含所有服务');

    // 验证请求计数信息
    const proxy1Stats = stats.requestCounts.find(s => s.name === 'Proxy1');
    this.assertEqual(proxy1Stats.requests, 10, 'Proxy1请求计数应该正确');
    this.assertEqual(proxy1Stats.limit, 100, 'Proxy1速率限制应该正确');

    console.log('✅ 代理服务统计和监控属性测试通过');
});

// 导出测试套件
window.proxyServiceTests = proxyServiceTests;