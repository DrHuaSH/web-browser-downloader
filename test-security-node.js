/**
 * Node.js环境下的SecurityManager测试
 */

// 模拟浏览器环境
global.window = {
    crypto: {
        getRandomValues: (array) => {
            for (let i = 0; i < array.length; i++) {
                array[i] = Math.floor(Math.random() * 256);
            }
            return array;
        }
    }
};

global.location = {
    protocol: 'https:',
    hostname: 'localhost'
};

global.document = {
    querySelector: () => null
};

global.URL = require('url').URL;

// 导入SecurityManager
const fs = require('fs');
const path = require('path');

// 读取SecurityManager代码并执行
const securityManagerCode = fs.readFileSync(path.join(__dirname, 'js/modules/SecurityManager.js'), 'utf8');

// 移除export语句并执行
const codeWithoutExport = securityManagerCode.replace('export class SecurityManager', 'class SecurityManager');
eval(codeWithoutExport);

// 测试函数
async function runSecurityTests() {
    console.log('开始SecurityManager测试...\n');
    
    const securityManager = new SecurityManager();
    await securityManager.initialize();
    
    let passed = 0;
    let failed = 0;
    
    // 测试1: HTTPS验证
    console.log('测试1: HTTPS验证');
    const httpsTests = [
        { url: 'https://example.com', expected: true },
        { url: 'http://example.com', expected: false },
        { url: 'http://localhost:3000', expected: true },
        { url: 'invalid-url', expected: false }
    ];
    
    for (const test of httpsTests) {
        const result = securityManager.validateHTTPS(test.url);
        if (result === test.expected) {
            console.log(`✅ ${test.url} -> ${result}`);
            passed++;
        } else {
            console.log(`❌ ${test.url} -> ${result} (期望: ${test.expected})`);
            failed++;
        }
    }
    
    // 测试2: URL安全性验证
    console.log('\n测试2: URL安全性验证');
    const safetyTests = [
        { url: 'https://example.com', expected: true },
        { url: 'javascript:alert("xss")', expected: false },
        { url: 'data:text/html,<script>alert("xss")</script>', expected: false }
    ];
    
    for (const test of safetyTests) {
        const result = securityManager.validateURLSafety(test.url);
        if (result === test.expected) {
            console.log(`✅ ${test.url.substring(0, 30)}... -> ${result}`);
            passed++;
        } else {
            console.log(`❌ ${test.url.substring(0, 30)}... -> ${result} (期望: ${test.expected})`);
            failed++;
        }
    }
    
    // 测试3: 敏感数据清理
    console.log('\n测试3: 敏感数据清理');
    const sanitizeTests = [
        { input: 'token=abc123', expected: 'token=***' },
        { input: 'password=secret', expected: 'password=***' },
        { input: 'normal text', expected: 'normal text' }
    ];
    
    for (const test of sanitizeTests) {
        const result = securityManager.sanitizeContent(test.input);
        if (result === test.expected) {
            console.log(`✅ "${test.input}" -> "${result}"`);
            passed++;
        } else {
            console.log(`❌ "${test.input}" -> "${result}" (期望: "${test.expected}")`);
            failed++;
        }
    }
    
    // 测试4: 安全文件名生成
    console.log('\n测试4: 安全文件名生成');
    const filenameTests = [
        'normal-file.txt',
        'file<>:"/\\|?*.txt',
        'CON.txt',
        ''
    ];
    
    for (const filename of filenameTests) {
        const result = securityManager.generateSecureFilename(filename);
        const isValid = result && result.length > 0 && !/[<>:"/\\|?*]/.test(result);
        if (isValid) {
            console.log(`✅ "${filename}" -> "${result}"`);
            passed++;
        } else {
            console.log(`❌ "${filename}" -> "${result}" (无效)`);
            failed++;
        }
    }
    
    // 测试5: 文件类型安全验证
    console.log('\n测试5: 文件类型安全验证');
    const fileTypeTests = [
        { filename: 'document.pdf', mimeType: 'application/pdf', expected: true },
        { filename: 'malware.exe', mimeType: 'application/x-executable', expected: false }
    ];
    
    for (const test of fileTypeTests) {
        const result = securityManager.validateFileTypeSafety(test.filename, test.mimeType);
        if (result === test.expected) {
            console.log(`✅ ${test.filename} (${test.mimeType}) -> ${result}`);
            passed++;
        } else {
            console.log(`❌ ${test.filename} (${test.mimeType}) -> ${result} (期望: ${test.expected})`);
            failed++;
        }
    }
    
    // 测试6: 安全随机数生成
    console.log('\n测试6: 安全随机数生成');
    const random1 = securityManager.generateSecureRandom(16);
    const random2 = securityManager.generateSecureRandom(16);
    
    if (random1.length === 32 && random2.length === 32 && random1 !== random2) {
        console.log(`✅ 随机数生成: "${random1}" != "${random2}"`);
        passed++;
    } else {
        console.log(`❌ 随机数生成失败`);
        failed++;
    }
    
    // 结果汇总
    console.log('\n' + '='.repeat(50));
    console.log('SecurityManager测试结果:');
    console.log(`总计: ${passed + failed}`);
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    return failed === 0;
}

// 运行测试
runSecurityTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});