/**
 * CORS代理服务 - 处理跨域请求和传输安全
 */
import { ErrorHandler } from './ErrorHandler.js';

export class ProxyService {
    constructor(securityManager) {
        this.securityManager = securityManager;
        this.errorHandler = new ErrorHandler();
        this.proxyServices = [
            {
                name: 'AllOrigins',
                url: 'https://api.allorigins.win/get?url=',
                type: 'allorigins',
                timeout: 10000,
                rateLimit: 100, // 每分钟请求限制
                lastUsed: 0,
                requestCount: 0
            },
            {
                name: 'CORS.SH',
                url: 'https://cors.sh/',
                type: 'cors-sh',
                timeout: 8000,
                rateLimit: 50,
                lastUsed: 0,
                requestCount: 0
            },
            {
                name: 'CORSProxy.io',
                url: 'https://corsproxy.io/?',
                type: 'corsproxy',
                timeout: 12000,
                rateLimit: 80,
                lastUsed: 0,
                requestCount: 0
            }
        ];
        this.currentProxyIndex = 0;
        this.isInitialized = false;
        this.failureCount = new Map(); // 跟踪代理服务失败次数
        this.circuitBreaker = new Map(); // 断路器状态
    }

    /**
     * 初始化代理服务
     */
    async initialize() {
        console.log('正在初始化代理服务...');
        
        // 验证可用的代理服务
        await this.validateProxyServices();
        
        // 设置健康检查定时器
        this.setupHealthCheck();
        
        this.isInitialized = true;
        console.log('代理服务初始化完成');
    }

    /**
     * 验证代理服务
     */
    async validateProxyServices() {
        const validServices = [];
        
        for (const service of this.proxyServices) {
            try {
                console.log(`验证代理服务: ${service.name}`);
                const isValid = await this.securityManager.validateProxyService(service.url);
                
                if (isValid) {
                    // 进行连通性测试
                    const isReachable = await this.testProxyConnectivity(service);
                    if (isReachable) {
                        validServices.push(service);
                        console.log(`✅ ${service.name} 验证通过`);
                    } else {
                        console.warn(`⚠️ ${service.name} 连通性测试失败`);
                    }
                } else {
                    console.warn(`⚠️ ${service.name} 安全验证失败`);
                }
            } catch (error) {
                console.warn(`❌ ${service.name} 验证失败:`, error.message);
            }
        }
        
        this.proxyServices = validServices;
        
        if (this.proxyServices.length === 0) {
            throw new Error('没有可用的代理服务');
        }
        
        console.log(`可用代理服务: ${this.proxyServices.length} 个`);
    }

    /**
     * 测试代理服务连通性
     * @param {Object} service - 代理服务配置
     * @returns {Promise<boolean>} 是否可达
     */
    async testProxyConnectivity(service) {
        try {
            const testUrl = 'https://httpbin.org/get';
            const proxyUrl = this.buildProxyURL(testUrl, service);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(proxyUrl, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'WebBrowserDownloader/1.0 ConnectivityTest'
                }
            });

            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * 设置健康检查
     */
    setupHealthCheck() {
        // 每5分钟检查一次代理服务健康状态
        setInterval(() => {
            this.performHealthCheck();
        }, 5 * 60 * 1000);

        // 每分钟重置请求计数
        setInterval(() => {
            this.resetRateLimits();
        }, 60 * 1000);
    }

    /**
     * 执行健康检查
     */
    async performHealthCheck() {
        console.log('执行代理服务健康检查...');
        
        for (const service of this.proxyServices) {
            const isHealthy = await this.testProxyConnectivity(service);
            
            if (!isHealthy) {
                this.recordFailure(service);
            } else {
                this.recordSuccess(service);
            }
        }
    }

    /**
     * 记录代理服务失败
     * @param {Object} service - 代理服务配置
     */
    recordFailure(service) {
        const failures = this.failureCount.get(service.name) || 0;
        this.failureCount.set(service.name, failures + 1);
        
        // 如果失败次数超过阈值，启用断路器
        if (failures >= 3) {
            this.circuitBreaker.set(service.name, {
                isOpen: true,
                openedAt: Date.now(),
                timeout: 5 * 60 * 1000 // 5分钟后重试
            });
            console.warn(`🔴 代理服务 ${service.name} 断路器已开启`);
        }
    }

    /**
     * 记录代理服务成功
     * @param {Object} service - 代理服务配置
     */
    recordSuccess(service) {
        this.failureCount.set(service.name, 0);
        this.circuitBreaker.delete(service.name);
    }

    /**
     * 检查断路器状态
     * @param {Object} service - 代理服务配置
     * @returns {boolean} 是否可用
     */
    isServiceAvailable(service) {
        const breaker = this.circuitBreaker.get(service.name);
        
        if (!breaker) {
            return true;
        }
        
        // 检查是否超过超时时间
        if (Date.now() - breaker.openedAt > breaker.timeout) {
            this.circuitBreaker.delete(service.name);
            console.log(`🟡 代理服务 ${service.name} 断路器已重置`);
            return true;
        }
        
        return false;
    }

    /**
     * 重置速率限制
     */
    resetRateLimits() {
        for (const service of this.proxyServices) {
            service.requestCount = 0;
        }
    }

    /**
     * 检查速率限制
     * @param {Object} service - 代理服务配置
     * @returns {boolean} 是否在限制内
     */
    checkRateLimit(service) {
        return service.requestCount < service.rateLimit;
    }

    /**
     * 选择最佳代理服务
     * @returns {Object|null} 最佳代理服务
     */
    selectBestProxy() {
        // 过滤可用的代理服务
        const availableServices = this.proxyServices.filter(service => 
            this.isServiceAvailable(service) && this.checkRateLimit(service)
        );
        
        if (availableServices.length === 0) {
            return null;
        }
        
        // 选择最近最少使用的服务
        return availableServices.reduce((best, current) => 
            current.lastUsed < best.lastUsed ? current : best
        );
    }

    /**
     * 代理GET请求
     * @param {string} url - 目标URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async proxyGet(url, options = {}) {
        if (!this.isInitialized) {
            throw new Error('代理服务未初始化');
        }

        // 验证目标URL安全性
        if (!this.securityManager.validateURLSafety(url)) {
            throw new Error('目标URL不安全');
        }

        // 强制使用HTTPS
        if (!this.securityManager.validateHTTPS(url)) {
            // 尝试升级到HTTPS
            const httpsUrl = url.replace(/^http:/, 'https:');
            if (this.securityManager.validateHTTPS(httpsUrl)) {
                url = httpsUrl;
                console.log('已将HTTP升级为HTTPS:', url);
            } else {
                throw new Error('目标URL必须使用HTTPS协议');
            }
        }

        let lastError;
        let attempts = 0;
        const maxAttempts = this.proxyServices.length;
        
        // 尝试所有可用的代理服务
        while (attempts < maxAttempts) {
            const service = this.selectBestProxy();
            
            if (!service) {
                throw new Error('没有可用的代理服务（速率限制或断路器开启）');
            }
            
            try {
                const response = await this.makeProxyRequest(service, url, options);
                
                // 记录成功使用
                service.lastUsed = Date.now();
                service.requestCount++;
                this.recordSuccess(service);
                
                return response;
                
            } catch (error) {
                console.warn(`代理服务 ${service.name} 请求失败:`, error.message);
                this.recordFailure(service);
                lastError = error;
                attempts++;
            }
        }
        
        throw new Error(`所有代理服务都失败了。最后错误: ${lastError.message}`);
    }

    /**
     * 执行代理请求
     * @param {Object} service - 代理服务配置
     * @param {string} url - 目标URL
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async makeProxyRequest(service, url, options) {
        const operationId = `proxy-${service.name}-${Date.now()}`;
        
        const requestFunction = async () => {
            const proxyUrl = this.buildProxyURL(url, service);
            
            // 设置请求超时
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), service.timeout);
            
            try {
                // 清理请求头
                const cleanHeaders = this.securityManager.sanitizeHeaders(options.headers || {});
                
                // 添加安全请求头
                const secureHeaders = {
                    ...cleanHeaders,
                    'User-Agent': 'WebBrowserDownloader/1.0',
                    'Accept': 'application/json, text/html, */*',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: secureHeaders,
                    signal: controller.signal,
                    mode: 'cors',
                    credentials: 'omit', // 不发送凭据
                    redirect: 'follow',
                    referrerPolicy: 'no-referrer'
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error(`请求超时 (${service.timeout}ms)`);
                }
                
                throw error;
            }
        };

        try {
            const response = await this.errorHandler.handleNetworkError(
                new Error('Network request preparation'),
                operationId,
                requestFunction
            );
            
            // 验证响应安全性
            await this.validateResponse(response, service);
            return response;
            
        } catch (error) {
            // 记录代理服务失败
            this.recordFailure(service);
            
            // 处理安全错误
            if (error.message.includes('certificate') || error.message.includes('SSL')) {
                const securityResult = this.errorHandler.handleSecurityError(error);
                if (!securityResult.canProceed) {
                    throw new Error(securityResult.message);
                }
            }
            
            throw error;
        }
    }
            await this.validateResponse(response, service);
            
            return response;
            
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`请求超时 (${service.timeout}ms)`);
            }
            
            throw error;
        }
    }

    /**
     * 验证响应安全性
     * @param {Response} response - HTTP响应
     * @param {Object} service - 代理服务配置
     */
    async validateResponse(response, service) {
        // 检查响应头
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            // 对于HTML响应，检查是否包含恶意内容
            const text = await response.clone().text();
            const sanitized = this.securityManager.sanitizeContent(text);
            
            if (sanitized !== text) {
                console.warn('响应内容包含敏感信息，已清理');
            }
        }
        
        // 检查响应大小
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB限制
            throw new Error('响应内容过大，可能存在安全风险');
        }
    }

    /**
     * 代理POST请求
     * @param {string} url - 目标URL
     * @param {Object} data - 请求数据
     * @param {Object} options - 请求选项
     * @returns {Promise<Response>} 响应对象
     */
    async proxyPost(url, data, options = {}) {
        // 目前不支持POST请求，因为大多数CORS代理不支持
        throw new Error('POST请求暂不支持，出于安全考虑');
    }

    /**
     * 构建代理URL
     * @param {string} targetURL - 目标URL
     * @param {Object} service - 代理服务配置
     * @returns {string} 代理URL
     */
    buildProxyURL(targetURL, service = null) {
        if (!service) {
            service = this.proxyServices[this.currentProxyIndex];
        }
        
        const encodedURL = encodeURIComponent(targetURL);
        
        switch (service.type) {
            case 'allorigins':
                return `${service.url}${encodedURL}`;
            
            case 'cors-sh':
                return `${service.url}${targetURL}`;
            
            case 'corsproxy':
                return `${service.url}${encodedURL}`;
            
            default:
                return `${service.url}${encodedURL}`;
        }
    }

    /**
     * 构建安全代理URL
     * @param {string} targetURL - 目标URL
     * @returns {string} 安全的代理URL
     */
    buildSecureProxyURL(targetURL) {
        // 确保使用HTTPS
        if (!this.securityManager.validateHTTPS(targetURL)) {
            targetURL = targetURL.replace(/^http:/, 'https:');
        }
        
        // 验证URL安全性
        if (!this.securityManager.validateURLSafety(targetURL)) {
            throw new Error('目标URL不安全');
        }
        
        const bestService = this.selectBestProxy();
        if (!bestService) {
            throw new Error('没有可用的代理服务');
        }
        
        return this.buildProxyURL(targetURL, bestService);
    }

    /**
     * 验证代理服务的SSL证书
     * @returns {Promise<boolean>} SSL证书是否有效
     */
    async validateProxySSL() {
        try {
            for (const service of this.proxyServices) {
                const isValid = await this.securityManager.validateProxyService(service.url);
                if (!isValid) {
                    console.error(`SSL证书验证失败: ${service.name}`);
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('SSL证书验证失败:', error);
            return false;
        }
    }

    /**
     * 获取代理服务统计信息
     * @returns {Object} 统计信息
     */
    getProxyStats() {
        return {
            totalServices: this.proxyServices.length,
            availableServices: this.proxyServices.filter(s => this.isServiceAvailable(s)).length,
            circuitBreakers: Array.from(this.circuitBreaker.keys()),
            requestCounts: this.proxyServices.map(s => ({
                name: s.name,
                requests: s.requestCount,
                limit: s.rateLimit
            }))
        };
    }

    /**
     * 错误处理回调
     * @param {Function} callback - 错误处理回调函数
     */
    onError(callback) {
        this.errorCallback = callback;
    }

    /**
     * 报告代理错误
     * @param {string} service - 服务名称
     * @param {Error} error - 错误对象
     */
    reportProxyError(service, error) {
        const errorEvent = {
            timestamp: new Date().toISOString(),
            service: service,
            error: error.message,
            stack: error.stack
        };

        console.error('代理服务错误:', errorEvent);

        if (this.errorCallback) {
            this.errorCallback(error);
        }
    }
}