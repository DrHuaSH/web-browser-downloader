/**
 * 安全管理器属性测试
 * 验证传输安全保证属性
 * **属性 10: 传输安全保证**
 * **验证: 需求 1.4, 5.2**
 */

// 导入SecurityManager (在测试环境中需要模拟)
import { SecurityManager } from '../js/modules/SecurityManager.js';

// 创建测试实例
const securityManagerTests = new TestFramework();

// 属性测试：传输安全保证
securityManagerTests.test('属性 10: 传输安全保证 - 所有网络请求都应强制使用HTTPS', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试用例：各种URL格式
    const testCases = [
        // HTTPS URLs - 应该通过
        { url: 'https://example.com', expected: true, description: '标准HTTPS URL' },
        { url: 'https://api.example.com/data', expected: true, description: 'HTTPS API URL' },
        { url: 'https://subdomain.example.com:8080/path', expected: true, description: '带端口的HTTPS URL' },
        
        // HTTP URLs - 应该失败（除了localhost）
        { url: 'http://example.com', expected: false, description: 'HTTP URL应该被拒绝' },
        { url: 'http://api.example.com', expected: false, description: 'HTTP API URL应该被拒绝' },
        
        // Localhost - 开发环境例外
        { url: 'http://localhost:3000', expected: true, description: 'localhost HTTP应该被允许' },
        { url: 'http://127.0.0.1:8080', expected: true, description: '127.0.0.1 HTTP应该被允许' },
        
        // 无效URLs
        { url: '', expected: false, description: '空URL应该被拒绝' },
        { url: null, expected: false, description: 'null URL应该被拒绝' },
        { url: 'invalid-url', expected: false, description: '无效URL格式应该被拒绝' },
        { url: 'ftp://example.com', expected: false, description: 'FTP协议应该被拒绝' }
    ];

    // 对每个测试用例验证HTTPS验证
    for (const testCase of testCases) {
        const result = securityManager.validateHTTPS(testCase.url);
        this.assertEqual(result, testCase.expected, 
            `${testCase.description}: URL "${testCase.url}" 期望 ${testCase.expected}, 实际 ${result}`);
    }

    console.log('✅ HTTPS验证属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - 代理服务必须使用HTTPS', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试代理服务URL验证
    const proxyTestCases = [
        // 安全的代理服务
        { url: 'https://api.allorigins.win/get?url=', expected: true, description: 'allorigins HTTPS代理' },
        { url: 'https://cors.sh/', expected: true, description: 'cors.sh HTTPS代理' },
        { url: 'https://corsproxy.io/?', expected: true, description: 'corsproxy HTTPS代理' },
        
        // 不安全的代理服务
        { url: 'http://cors-anywhere.herokuapp.com/', expected: false, description: 'HTTP代理应该被拒绝' },
        { url: 'http://api.allorigins.win/get?url=', expected: false, description: 'HTTP allorigins应该被拒绝' }
    ];

    for (const testCase of proxyTestCases) {
        try {
            const result = await securityManager.validateProxyService(testCase.url);
            
            if (testCase.expected) {
                // 对于期望成功的情况，结果可能因网络而异，但至少HTTPS验证应该通过
                const httpsValid = securityManager.validateHTTPS(testCase.url);
                this.assertTrue(httpsValid, `${testCase.description}: HTTPS验证应该通过`);
            } else {
                this.assertFalse(result, `${testCase.description}: 应该被拒绝`);
            }
        } catch (error) {
            // 网络错误是可以接受的，但HTTPS验证仍应正确
            const httpsValid = securityManager.validateHTTPS(testCase.url);
            if (testCase.expected) {
                this.assertTrue(httpsValid, `${testCase.description}: HTTPS验证应该通过（即使网络失败）`);
            } else {
                this.assertFalse(httpsValid, `${testCase.description}: HTTPS验证应该失败`);
            }
        }
    }

    console.log('✅ 代理服务HTTPS验证属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - URL安全性验证', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试URL安全性验证
    const safetyTestCases = [
        // 安全的URLs
        { url: 'https://example.com/page', expected: true, description: '正常HTTPS URL' },
        { url: 'https://api.example.com/v1/data', expected: true, description: 'API端点URL' },
        
        // 危险的URLs
        { url: 'javascript:alert("xss")', expected: false, description: 'JavaScript协议应该被阻止' },
        { url: 'data:text/html,<script>alert("xss")</script>', expected: false, description: 'Data URL HTML应该被阻止' },
        { url: 'vbscript:msgbox("xss")', expected: false, description: 'VBScript协议应该被阻止' },
        { url: 'file:///etc/passwd', expected: false, description: 'File协议应该被阻止' },
        
        // 超长URLs
        { url: 'https://example.com/' + 'a'.repeat(3000), expected: false, description: '超长URL应该被拒绝' }
    ];

    for (const testCase of safetyTestCases) {
        const result = securityManager.validateURLSafety(testCase.url);
        this.assertEqual(result, testCase.expected, 
            `${testCase.description}: URL "${testCase.url.substring(0, 50)}..." 期望 ${testCase.expected}, 实际 ${result}`);
    }

    console.log('✅ URL安全性验证属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - 敏感数据清理', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试敏感数据清理
    const sensitiveDataCases = [
        {
            input: 'token=abc123def456',
            expected: 'token=***',
            description: '应该清理token'
        },
        {
            input: 'api_key=secret123',
            expected: 'api_key=***',
            description: '应该清理API key'
        },
        {
            input: 'password=mypassword123',
            expected: 'password=***',
            description: '应该清理密码'
        },
        {
            input: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            expected: 'Authorization: ***',
            description: '应该清理Bearer token'
        },
        {
            input: 'session_id=sess_abc123',
            expected: 'session_id=***',
            description: '应该清理session ID'
        },
        {
            input: 'normal data without secrets',
            expected: 'normal data without secrets',
            description: '正常数据应该保持不变'
        },
        {
            input: '<script>alert("xss")</script>',
            expected: '',
            description: '应该移除script标签'
        },
        {
            input: 'javascript:alert("xss")',
            expected: 'javascript-blocked:alert("xss")',
            description: '应该阻止javascript协议'
        }
    ];

    for (const testCase of sensitiveDataCases) {
        const result = securityManager.sanitizeContent(testCase.input);
        this.assertEqual(result, testCase.expected, 
            `${testCase.description}: 输入 "${testCase.input}" 期望 "${testCase.expected}", 实际 "${result}"`);
    }

    console.log('✅ 敏感数据清理属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - 安全文件名生成', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试安全文件名生成
    const filenameTestCases = [
        {
            input: 'normal-file.txt',
            description: '正常文件名应该保持不变'
        },
        {
            input: 'file<>:"/\\|?*.txt',
            description: '危险字符应该被替换为下划线'
        },
        {
            input: 'CON.txt',
            description: 'Windows保留名称应该被修改'
        },
        {
            input: 'very-long-filename-' + 'a'.repeat(200) + '.txt',
            description: '超长文件名应该被截断'
        },
        {
            input: '   spaces   .txt',
            description: '空格应该被替换'
        },
        {
            input: '...hidden.txt',
            description: '开头的点应该被移除'
        },
        {
            input: '',
            description: '空文件名应该生成随机名称'
        },
        {
            input: null,
            description: 'null文件名应该生成随机名称'
        }
    ];

    for (const testCase of filenameTestCases) {
        const result = securityManager.generateSecureFilename(testCase.input);
        
        // 验证结果不为空
        this.assertTrue(result && result.length > 0, 
            `${testCase.description}: 结果不应为空`);
        
        // 验证不包含危险字符
        const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
        this.assertFalse(dangerousChars.test(result), 
            `${testCase.description}: 结果不应包含危险字符: "${result}"`);
        
        // 验证长度限制
        this.assertTrue(result.length <= 100, 
            `${testCase.description}: 结果长度应该 <= 100: ${result.length}`);
        
        console.log(`  ${testCase.description}: "${testCase.input}" -> "${result}"`);
    }

    console.log('✅ 安全文件名生成属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - 文件类型安全验证', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试文件类型安全验证
    const fileTypeTestCases = [
        // 安全的文件类型
        { filename: 'document.pdf', mimeType: 'application/pdf', expected: true, description: 'PDF文件应该安全' },
        { filename: 'image.jpg', mimeType: 'image/jpeg', expected: true, description: 'JPEG图片应该安全' },
        { filename: 'text.txt', mimeType: 'text/plain', expected: true, description: '文本文件应该安全' },
        { filename: 'video.mp4', mimeType: 'video/mp4', expected: true, description: 'MP4视频应该安全' },
        
        // 危险的文件类型
        { filename: 'malware.exe', mimeType: 'application/x-executable', expected: false, description: 'EXE文件应该被拒绝' },
        { filename: 'script.bat', mimeType: 'application/x-msdos-program', expected: false, description: 'BAT文件应该被拒绝' },
        { filename: 'code.js', mimeType: 'application/javascript', expected: false, description: 'JavaScript文件应该被拒绝' },
        { filename: 'installer.msi', mimeType: 'application/x-msdownload', expected: false, description: 'MSI文件应该被拒绝' }
    ];

    for (const testCase of fileTypeTestCases) {
        const result = securityManager.validateFileTypeSafety(testCase.filename, testCase.mimeType);
        this.assertEqual(result, testCase.expected, 
            `${testCase.description}: 文件 "${testCase.filename}" (${testCase.mimeType}) 期望 ${testCase.expected}, 实际 ${result}`);
    }

    console.log('✅ 文件类型安全验证属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - HTTP请求头清理', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试HTTP请求头清理
    const headersTestCase = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'WebBrowserDownloader/1.0',
        'Authorization': 'Bearer secret-token', // 应该被移除
        'X-Custom-Header': 'custom-value', // 应该被移除
        'Cookie': 'session=abc123', // 应该被移除
        'Accept-Language': 'zh-CN,zh;q=0.9'
    };

    const sanitizedHeaders = securityManager.sanitizeHeaders(headersTestCase);

    // 验证允许的头部存在
    this.assertTrue('Accept' in sanitizedHeaders, '应该保留Accept头部');
    this.assertTrue('Content-Type' in sanitizedHeaders, '应该保留Content-Type头部');
    this.assertTrue('User-Agent' in sanitizedHeaders, '应该保留User-Agent头部');
    this.assertTrue('Accept-Language' in sanitizedHeaders, '应该保留Accept-Language头部');

    // 验证危险的头部被移除
    this.assertFalse('Authorization' in sanitizedHeaders, '应该移除Authorization头部');
    this.assertFalse('X-Custom-Header' in sanitizedHeaders, '应该移除自定义头部');
    this.assertFalse('Cookie' in sanitizedHeaders, '应该移除Cookie头部');

    console.log('✅ HTTP请求头清理属性测试通过');
});

securityManagerTests.test('属性 10: 传输安全保证 - 安全随机数生成', async function() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();

    // 测试安全随机数生成
    const randomLength = 16;
    const random1 = securityManager.generateSecureRandom(randomLength);
    const random2 = securityManager.generateSecureRandom(randomLength);

    // 验证随机数长度
    this.assertEqual(random1.length, randomLength * 2, '随机数长度应该正确（十六进制）');
    this.assertEqual(random2.length, randomLength * 2, '随机数长度应该正确（十六进制）');

    // 验证随机数不同
    this.assertTrue(random1 !== random2, '两次生成的随机数应该不同');

    // 验证随机数格式（十六进制）
    const hexPattern = /^[0-9a-f]+$/;
    this.assertTrue(hexPattern.test(random1), '随机数应该是有效的十六进制字符串');
    this.assertTrue(hexPattern.test(random2), '随机数应该是有效的十六进制字符串');

    console.log('✅ 安全随机数生成属性测试通过');
});

// 导出测试套件
window.securityManagerTests = securityManagerTests;