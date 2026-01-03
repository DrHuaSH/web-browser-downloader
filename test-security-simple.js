/**
 * 简化的SecurityManager测试
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
global.fetch = () => Promise.resolve({ headers: { get: () => null } });

// 简化的SecurityManager类用于测试
class SecurityManager {
    constructor() {
        this.isInitialized = false;
        this.blockedPatterns = [
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i,
            /file:/i
        ];
        this.sensitivePatterns = [
            /token[=:]\s*[a-zA-Z0-9_-]+/gi,
            /api[_-]?key[=:]\s*[a-zA-Z0-9_-]+/gi,
            /password[=:]\s*[^\s&]+/gi
        ];
    }

    async initialize() {
        this.isInitialized = true;
    }

    validateHTTPS(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        try {
            const urlObj = new URL(url);
            
            // 允许localhost用于开发
            if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                return true;
            }
            
            return urlObj.protocol === 'https:';
        } catch (error) {
            return false;
        }
    }

    validateURLSafety(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }

        // 检查是否包含危险协议
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(url)) {
                return false;
            }
        }

        // 检查URL长度
        if (url.length > 2048) {
            return false;
        }

        return true;
    }

    sanitizeContent(content) {
        if (!content || typeof content !== 'string') {
            return content;
        }

        let sanitized = content;
        
        // 移除敏感信息模式
        for (const pattern of this.sensitivePatterns) {
            sanitized = sanitized.replace(pattern, (match) => {
                const parts = match.split(/[=:]/);
                return parts[0] + (parts[1] ? '=***' : '');
            });
        }

        return sanitized;
    }

    generateSecureFilename(originalName) {
        if (!originalName || typeof originalName !== 'string') {
            return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        }

        // 移除危险字符
        let safeName = originalName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/^\.+/, '')
            .replace(/\.+$/, '')
            .trim();

        // 检查Windows保留名称
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL'];
        const nameWithoutExt = safeName.split('.')[0].toUpperCase();
        if (reservedNames.includes(nameWithoutExt)) {
            safeName = 'file_' + safeName;
        }

        // 限制长度
        if (safeName.length > 100) {
            const parts = safeName.split('.');
            const ext = parts.length > 1 ? '.' + parts.pop() : '';
            const name = parts.join('.');
            safeName = name.substring(0, 100 - ext.length) + ext;
        }

        if (!safeName || safeName === '_') {
            return 'download_' + Date.now();
        }

        return safeName;
    }

    validateFileTypeSafety(filename, mimeType) {
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.js'];
        const ext = '.' + filename.toLowerCase().split('.').pop();
        
        if (dangerousExtensions.includes(ext)) {
            return false;
        }

        if (mimeType) {
            const dangerousMimeTypes = [
                'application/x-executable',
                'application/javascript'
            ];
            if (dangerousMimeTypes.includes(mimeType.toLowerCase())) {
                return false;
            }
        }

        return true;
    }

    generateSecureRandom(length = 16) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
}

// 测试函数
async function runSecurityTests() {
    console.log('开始SecurityManager测试...\n');
    
    const securityManager = new SecurityManager();
    await securityManager.initialize();
    
    let passed = 0;
    let failed = 0;
    
    function test(description, actual, expected) {
        if (actual === expected) {
            console.log(`✅ ${description}: ${actual}`);
            passed++;
        } else {
            console.log(`❌ ${description}: ${actual} (期望: ${expected})`);
            failed++;
        }
    }
    
    // 测试1: HTTPS验证
    console.log('测试1: HTTPS验证');
    test('HTTPS URL应该通过', securityManager.validateHTTPS('https://example.com'), true);
    test('HTTP URL应该失败', securityManager.validateHTTPS('http://example.com'), false);
    test('localhost HTTP应该通过', securityManager.validateHTTPS('http://localhost:3000'), true);
    test('无效URL应该失败', securityManager.validateHTTPS('invalid-url'), false);
    
    // 测试2: URL安全性验证
    console.log('\n测试2: URL安全性验证');
    test('正常HTTPS URL应该安全', securityManager.validateURLSafety('https://example.com'), true);
    test('JavaScript协议应该不安全', securityManager.validateURLSafety('javascript:alert("xss")'), false);
    test('Data URL应该不安全', securityManager.validateURLSafety('data:text/html,<script>'), false);
    
    // 测试3: 敏感数据清理
    console.log('\n测试3: 敏感数据清理');
    test('Token应该被清理', securityManager.sanitizeContent('token=abc123'), 'token=***');
    test('Password应该被清理', securityManager.sanitizeContent('password=secret'), 'password=***');
    test('正常文本应该保持不变', securityManager.sanitizeContent('normal text'), 'normal text');
    
    // 测试4: 安全文件名生成
    console.log('\n测试4: 安全文件名生成');
    const normalFile = securityManager.generateSecureFilename('normal-file.txt');
    test('正常文件名长度正确', normalFile.length > 0, true);
    
    const dangerousFile = securityManager.generateSecureFilename('file<>:"/\\|?*.txt');
    test('危险字符被移除', !/[<>:"/\\|?*]/.test(dangerousFile), true);
    
    const reservedFile = securityManager.generateSecureFilename('CON.txt');
    test('保留名称被修改', reservedFile.startsWith('file_'), true);
    
    // 测试5: 文件类型安全验证
    console.log('\n测试5: 文件类型安全验证');
    test('PDF文件应该安全', securityManager.validateFileTypeSafety('document.pdf', 'application/pdf'), true);
    test('EXE文件应该不安全', securityManager.validateFileTypeSafety('malware.exe', 'application/x-executable'), false);
    
    // 测试6: 安全随机数生成
    console.log('\n测试6: 安全随机数生成');
    const random1 = securityManager.generateSecureRandom(16);
    const random2 = securityManager.generateSecureRandom(16);
    test('随机数长度正确', random1.length, 32);
    test('两次随机数不同', random1 !== random2, true);
    
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