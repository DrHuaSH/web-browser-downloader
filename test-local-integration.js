/**
 * 本地集成测试脚本
 * 测试Web浏览器下载器的核心功能
 */

const http = require('http');

// 测试服务器响应
function testServerResponse() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            console.log(`✅ 服务器响应状态: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                // 检查HTML内容
                const hasTitle = data.includes('Web浏览器下载器');
                const hasApp = data.includes('id="app"');
                const hasButtons = data.includes('media-download-btn');
                const hasCSS = data.includes('styles/main.css');
                const hasJS = data.includes('js/main.js');
                
                console.log(`✅ 页面标题检查: ${hasTitle ? '通过' : '失败'}`);
                console.log(`✅ 应用容器检查: ${hasApp ? '通过' : '失败'}`);
                console.log(`✅ 下载按钮检查: ${hasButtons ? '通过' : '失败'}`);
                console.log(`✅ CSS文件引用检查: ${hasCSS ? '通过' : '失败'}`);
                console.log(`✅ JS文件引用检查: ${hasJS ? '通过' : '失败'}`);
                
                if (hasTitle && hasApp && hasButtons && hasCSS && hasJS) {
                    resolve('主页面测试通过');
                } else {
                    reject('主页面测试失败');
                }
            });
        });

        req.on('error', (err) => {
            reject(`服务器连接失败: ${err.message}`);
        });

        req.end();
    });
}

// 测试测试运行器页面
function testTestRunner() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: '/tests/test-runner-clean.html',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            console.log(`✅ 测试运行器响应状态: ${res.statusCode}`);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                // 检查测试运行器内容
                const hasTestTitle = data.includes('测试运行器');
                const hasTestButtons = data.includes('run-all-tests');
                const hasTestOutput = data.includes('test-output');
                const hasTestFramework = data.includes('test-framework.js');
                
                console.log(`✅ 测试页面标题检查: ${hasTestTitle ? '通过' : '失败'}`);
                console.log(`✅ 测试按钮检查: ${hasTestButtons ? '通过' : '失败'}`);
                console.log(`✅ 测试输出区域检查: ${hasTestOutput ? '通过' : '失败'}`);
                console.log(`✅ 测试框架引用检查: ${hasTestFramework ? '通过' : '失败'}`);
                
                if (hasTestTitle && hasTestButtons && hasTestOutput && hasTestFramework) {
                    resolve('测试运行器页面测试通过');
                } else {
                    reject('测试运行器页面测试失败');
                }
            });
        });

        req.on('error', (err) => {
            reject(`测试运行器连接失败: ${err.message}`);
        });

        req.end();
    });
}

// 测试静态资源
function testStaticResources() {
    return new Promise((resolve, reject) => {
        const resources = [
            '/styles/main.css',
            '/js/main.js',
            '/js/modules/SecurityManager.js',
            '/js/modules/UIController.js',
            '/manifest.json'
        ];
        
        let completed = 0;
        let passed = 0;
        
        resources.forEach(resource => {
            const options = {
                hostname: 'localhost',
                port: 8080,
                path: resource,
                method: 'HEAD'
            };
            
            const req = http.request(options, (res) => {
                completed++;
                if (res.statusCode === 200) {
                    passed++;
                    console.log(`✅ 资源可访问: ${resource}`);
                } else {
                    console.log(`❌ 资源访问失败: ${resource} (${res.statusCode})`);
                }
                
                if (completed === resources.length) {
                    if (passed === resources.length) {
                        resolve('静态资源测试通过');
                    } else {
                        reject(`静态资源测试失败: ${passed}/${resources.length} 通过`);
                    }
                }
            });
            
            req.on('error', (err) => {
                completed++;
                console.log(`❌ 资源连接失败: ${resource} - ${err.message}`);
                
                if (completed === resources.length) {
                    reject(`静态资源测试失败: ${passed}/${resources.length} 通过`);
                }
            });
            
            req.end();
        });
    });
}

// 运行所有测试
async function runIntegrationTests() {
    console.log('开始本地集成测试...\n');
    
    try {
        console.log('=== 测试1: 主页面响应 ===');
        await testServerResponse();
        console.log('');
        
        console.log('=== 测试2: 测试运行器页面 ===');
        await testTestRunner();
        console.log('');
        
        console.log('=== 测试3: 静态资源访问 ===');
        await testStaticResources();
        console.log('');
        
        console.log('🎉 所有本地集成测试通过！');
        console.log('');
        console.log('应用访问地址:');
        console.log('- 主应用: http://localhost:8080');
        console.log('- 测试运行器: http://localhost:8080/tests/test-runner-clean.html');
        
    } catch (error) {
        console.error('❌ 集成测试失败:', error);
        process.exit(1);
    }
}

// 启动测试
runIntegrationTests();