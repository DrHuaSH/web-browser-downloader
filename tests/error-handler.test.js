/**
 * 错误处理管理器测试
 * 验证ErrorHandler的错误分析、重试机制和恢复功能
 */

import { ErrorHandler } from '../js/modules/ErrorHandler.js';

// 全局测试对象
window.errorHandlerTests = {
    async runTests() {
        const framework = window.TestFramework;
        const suite = framework.createSuite('错误处理管理器测试');

        // 测试数据生成器
        const testDataGenerators = {
            // 生成各种类型的错误
            generateNetworkErrors() {
                return [
                    new TypeError('Failed to fetch'),
                    new Error('Network request failed'),
                    new Error('Connection timeout'),
                    new Error('Request timeout after 30000ms')
                ];
            },

            generateCORSErrors() {
                return [
                    new Error('CORS policy blocked the request'),
                    new Error('Access to fetch blocked by CORS policy'),
                    new Error('Cross-Origin Request Blocked')
                ];
            },

            generateSSLErrors() {
                return [
                    new Error('SSL certificate verification failed'),
                    new Error('Invalid SSL certificate'),
                    new Error('Certificate has expired')
                ];
            },

            generateHTTPErrors() {
                return [
                    new Error('HTTP 404 Not Found'),
                    new Error('HTTP 403 Forbidden'),
                    new Error('HTTP 401 Unauthorized'),
                    new Error('HTTP 500 Internal Server Error'),
                    new Error('HTTP 502 Bad Gateway'),
                    new Error('HTTP 503 Service Unavailable')
                ];
            },

            generateMobileErrors() {
                return [
                    new Error('Storage quota exceeded'),
                    new Error('Permission denied for download'),
                    new Error('Insufficient memory'),
                    new Error('Blob download not supported')
                ];
            }
        };

        // 模拟网络状态
        function mockNetworkStatus(isOnline) {
            Object.defineProperty(navigator, 'onLine', {
                value: isOnline,
                configurable: true
            });
        }

        // 模拟用户代理
        function mockUserAgent(userAgent) {
            Object.defineProperty(navigator, 'userAgent', {
                value: userAgent,
                configurable: true
            });
        }

        // 网络错误处理测试
        suite.addTest('网络错误分析和分类', async () => {
            const errorHandler = new ErrorHandler();
            const networkErrors = testDataGenerators.generateNetworkErrors();

            for (const error of networkErrors) {
                const errorInfo = errorHandler.analyzeError(error);

                framework.assert(
                    errorInfo.type === 'network' || errorInfo.type === 'timeout',
                    `网络错误应该被正确分类: ${error.message}`
                );

                framework.assert(
                    errorInfo.isRetryable === true,
                    '网络错误应该可以重试'
                );

                framework.assert(
                    ['low', 'medium', 'high'].includes(errorInfo.severity),
                    '错误严重程度应该有效'
                );
            }
        });

        suite.addTest('CORS错误处理', async () => {
            const errorHandler = new ErrorHandler();
            const corsErrors = testDataGenerators.generateCORSErrors();

            for (const error of corsErrors) {
                const errorInfo = errorHandler.analyzeError(error);

                framework.assert(
                    errorInfo.type === 'cors',
                    'CORS错误应该被正确识别'
                );

                framework.assert(
                    errorInfo.isRetryable === false,
                    'CORS错误不应该重试'
                );

                const message = errorHandler.generateUserFriendlyMessage(errorInfo);
                framework.assert(
                    message.includes('跨域') || message.includes('代理'),
                    'CORS错误消息应该提供解决方案'
                );
            }
        });

        suite.addTest('SSL错误处理', async () => {
            const errorHandler = new ErrorHandler();
            const sslErrors = testDataGenerators.generateSSLErrors();

            for (const error of sslErrors) {
                const errorInfo = errorHandler.analyzeError(error);

                framework.assert(
                    errorInfo.type === 'ssl',
                    'SSL错误应该被正确识别'
                );

                framework.assert(
                    errorInfo.isRetryable === false,
                    'SSL错误不应该重试'
                );

                const securityResult = errorHandler.handleSecurityError(error);
                framework.assert(
                    securityResult.canProceed === false,
                    'SSL错误应该阻止继续操作'
                );
            }
        });

        suite.addTest('HTTP状态码错误处理', async () => {
            const errorHandler = new ErrorHandler();
            const httpErrors = testDataGenerators.generateHTTPErrors();

            for (const error of httpErrors) {
                const errorInfo = errorHandler.analyzeError(error);

                if (error.message.includes('404')) {
                    framework.assert(
                        errorInfo.type === 'notfound',
                        '404错误应该被正确分类'
                    );
                    framework.assert(
                        errorInfo.isRetryable === false,
                        '404错误不应该重试'
                    );
                } else if (error.message.includes('403') || error.message.includes('401')) {
                    framework.assert(
                        errorInfo.type === 'auth',
                        '认证错误应该被正确分类'
                    );
                    framework.assert(
                        errorInfo.isRetryable === false,
                        '认证错误不应该重试'
                    );
                } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
                    framework.assert(
                        errorInfo.type === 'server',
                        '服务器错误应该被正确分类'
                    );
                    framework.assert(
                        errorInfo.isRetryable === true,
                        '服务器错误应该可以重试'
                    );
                }
            }
        });

        suite.addTest('重试机制测试', async () => {
            const errorHandler = new ErrorHandler();
            let attemptCount = 0;

            const mockOperation = async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Network request failed');
                }
                return 'success';
            };

            try {
                const result = await errorHandler.handleNetworkError(
                    new Error('Network request failed'),
                    'test-operation',
                    mockOperation
                );

                framework.assert(
                    result === 'success',
                    '重试机制应该最终成功'
                );

                framework.assert(
                    attemptCount === 3,
                    `应该重试3次，实际重试${attemptCount}次`
                );
            } catch (error) {
                framework.assert(false, `重试机制测试失败: ${error.message}`);
            }
        });

        suite.addTest('重试次数限制', async () => {
            const errorHandler = new ErrorHandler();
            let attemptCount = 0;

            const mockFailingOperation = async () => {
                attemptCount++;
                throw new Error('Network request failed');
            };

            try {
                await errorHandler.handleNetworkError(
                    new Error('Network request failed'),
                    'failing-operation',
                    mockFailingOperation
                );
                framework.assert(false, '应该抛出错误');
            } catch (error) {
                framework.assert(
                    attemptCount === errorHandler.maxRetries + 1,
                    `应该尝试${errorHandler.maxRetries + 1}次，实际尝试${attemptCount}次`
                );
            }
        });

        suite.addTest('移动设备错误处理', async () => {
            const errorHandler = new ErrorHandler();
            const mobileErrors = testDataGenerators.generateMobileErrors();

            // 测试iOS设备
            mockUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');

            for (const error of mobileErrors) {
                const message = errorHandler.handleMobileError(error, 'download');

                framework.assert(
                    typeof message === 'string' && message.length > 0,
                    '移动设备错误应该返回有效消息'
                );

                if (error.message.includes('blob')) {
                    framework.assert(
                        message.includes('iOS') && message.includes('长按'),
                        'iOS blob错误应该提供正确指导'
                    );
                }
            }

            // 测试Android设备
            mockUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F)');

            for (const error of mobileErrors) {
                const message = errorHandler.handleMobileError(error, 'download');

                framework.assert(
                    typeof message === 'string' && message.length > 0,
                    'Android设备错误应该返回有效消息'
                );

                if (error.message.includes('permission')) {
                    framework.assert(
                        message.includes('Android') && message.includes('权限'),
                        'Android权限错误应该提供正确指导'
                    );
                }
            }
        });

        suite.addTest('安全错误处理', async () => {
            const errorHandler = new ErrorHandler();

            // 测试混合内容错误
            const mixedContentError = new Error('Mixed Content: The page was loaded over HTTPS');
            const mixedResult = errorHandler.handleSecurityError(mixedContentError);

            framework.assert(
                mixedResult.action === 'upgrade',
                '混合内容错误应该触发升级操作'
            );

            framework.assert(
                mixedResult.canProceed === true,
                '混合内容错误升级后应该可以继续'
            );

            // 测试证书错误
            const certError = new Error('SSL certificate verification failed');
            const certResult = errorHandler.handleSecurityError(certError);

            framework.assert(
                certResult.action === 'warn',
                '证书错误应该触发警告'
            );

            framework.assert(
                certResult.canProceed === false,
                '证书错误应该阻止继续操作'
            );

            // 测试CSP错误
            const cspError = new Error('CSP violation detected');
            const cspResult = errorHandler.handleSecurityError(cspError);

            framework.assert(
                cspResult.action === 'block',
                'CSP错误应该阻止操作'
            );

            framework.assert(
                cspResult.canProceed === false,
                'CSP错误应该阻止继续操作'
            );
        });

        suite.addTest('敏感数据清理', async () => {
            const errorHandler = new ErrorHandler();

            const sensitiveData = {
                username: 'testuser',
                password: 'secret123',
                token: 'abc123xyz',
                apiKey: 'key456',
                normalData: 'public info',
                nested: {
                    secret: 'hidden',
                    public: 'visible'
                }
            };

            const cleaned = errorHandler.sanitizeData(sensitiveData);

            framework.assert(
                cleaned.password === '[REDACTED]',
                '密码应该被清理'
            );

            framework.assert(
                cleaned.token === '[REDACTED]',
                '令牌应该被清理'
            );

            framework.assert(
                cleaned.apiKey === '[REDACTED]',
                'API密钥应该被清理'
            );

            framework.assert(
                cleaned.normalData === 'public info',
                '普通数据应该保持不变'
            );

            framework.assert(
                cleaned.nested.secret === '[REDACTED]',
                '嵌套的敏感数据应该被清理'
            );

            framework.assert(
                cleaned.nested.public === 'visible',
                '嵌套的普通数据应该保持不变'
            );
        });

        suite.addTest('网络状态监控', async () => {
            const errorHandler = new ErrorHandler();
            let networkEvents = [];

            errorHandler.addErrorListener((event) => {
                networkEvents.push(event);
            });

            // 模拟网络断开
            mockNetworkStatus(false);
            window.dispatchEvent(new Event('offline'));

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 10));

            framework.assert(
                networkEvents.some(event => event.type === 'network-loss'),
                '应该检测到网络断开事件'
            );

            // 模拟网络恢复
            mockNetworkStatus(true);
            window.dispatchEvent(new Event('online'));

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 10));

            framework.assert(
                networkEvents.some(event => event.type === 'network-restore'),
                '应该检测到网络恢复事件'
            );
        });

        suite.addTest('错误统计功能', async () => {
            const errorHandler = new ErrorHandler();

            // 模拟一些重试操作
            errorHandler.retryAttempts.set('op1', 2);
            errorHandler.retryAttempts.set('op2', 1);
            errorHandler.retryAttempts.set('op3', 3);

            const stats = errorHandler.getErrorStats();

            framework.assert(
                stats.totalRetries === 6,
                `总重试次数应该是6，实际是${stats.totalRetries}`
            );

            framework.assert(
                stats.activeOperations === 3,
                `活跃操作数应该是3，实际是${stats.activeOperations}`
            );

            framework.assert(
                typeof stats.networkStatus === 'string',
                '网络状态应该是字符串'
            );
        });

        suite.addTest('性能测试: 大量错误处理', async () => {
            const errorHandler = new ErrorHandler();
            const startTime = performance.now();
            const errorCount = 100;

            // 处理大量错误
            for (let i = 0; i < errorCount; i++) {
                const error = new Error(`Test error ${i}`);
                const errorInfo = errorHandler.analyzeError(error);
                const message = errorHandler.generateUserFriendlyMessage(errorInfo);
                
                framework.assert(
                    typeof message === 'string',
                    `错误 ${i} 应该生成有效消息`
                );
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            framework.assert(
                duration < 100, // 100ms内完成
                `处理${errorCount}个错误应该在100ms内完成，实际用时 ${duration.toFixed(2)}ms`
            );
        });

        return await suite.run();
    }
};

console.log('错误处理管理器测试模块已加载');