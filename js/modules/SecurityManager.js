/**
 * 安全管理器 - 管理传输安全和隐私保护
 */
import { ErrorHandler } from './ErrorHandler.js';

export class SecurityManager {
    constructor() {
        this.isInitialized = false;
        this.errorHandler = new ErrorHandler();
        this.trustedDomains = new Set([
            'github.io',
            'githubusercontent.com',
            'allorigins.win',
            'cors.sh',
            'corsproxy.io'
        ]);
        this.blockedPatterns = [
            /javascript:/i,
            /data:text\/html/i,
            /vbscript:/i,
            /file:/i
        ];
        this.sensitivePatterns = [
            /token[=:]\s*[a-zA-Z0-9_-]+/gi,
            /api[_-]?key[=:]\s*[a-zA-Z0-9_-]+/gi,
            /password[=:]\s*[^\s&]+/gi,
            /secret[=:]\s*[^\s&]+/gi,
            /authorization[=:]\s*[^\s&]+/gi,
            /bearer\s+[a-zA-Z0-9_-]+/gi,
            /session[_-]?id[=:]\s*[^\s&]+/gi
        ];
    }

    /**
     * 初始化安全管理器
     */
    async initialize() {
        // 检查当前环境的安全性
        await this.checkEnvironmentSecurity();
        
        // 设置安全策略
        this.setupSecurityPolicies();
        
        this.isInitialized = true;
        console.log('安全管理器初始化完成');
    }

    /**
     * 检查环境安全性
     */
    async checkEnvironmentSecurity() {
        // 检查是否在HTTPS环境中运行
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            console.warn('警告: 应用未在HTTPS环境中运行，安全性可能受到影响');
        }

        // 检查是否支持必要的安全API
        if (!window.crypto || !window.crypto.getRandomValues) {
            throw new Error('浏览器不支持必要的加密API');
        }

        // 检查CSP支持
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            console.warn('建议设置Content Security Policy以增强安全性');
        }
    }

    /**
     * 设置安全策略
     */
    setupSecurityPolicies() {
        // 禁用不安全的功能
        if (typeof eval !== 'undefined') {
            // 在生产环境中应该通过CSP禁用eval
            console.warn('检测到eval函数，建议在生产环境中禁用');
        }

        // 设置安全的默认值
        this.setupSecureDefaults();
    }

    /**
     * 设置安全默认值
     */
    setupSecureDefaults() {
        // 防止点击劫持
        if (window.self !== window.top) {
            console.warn('检测到页面在iframe中运行，请确保来源可信');
        }

        // 清理referrer信息
        if (document.referrerPolicy !== 'strict-origin-when-cross-origin') {
            console.info('建议设置referrerPolicy为strict-origin-when-cross-origin');
        }
    }

    /**
     * 验证并升级到HTTPS
     * @param {string} url - 要验证的URL
     * @returns {Object} 验证和升级结果
     */
    validateAndUpgradeHTTPS(url) {
        const result = {
            originalUrl: url,
            upgradedUrl: url,
            isSecure: false,
            wasUpgraded: false,
            error: null
        };

        if (!url || typeof url !== 'string') {
            result.error = new Error('URL不能为空或必须是字符串');
            return result;
        }

        try {
            const urlObj = new URL(url);
            
            // 允许localhost用于开发
            if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
                result.isSecure = true;
                return result;
            }
            
            if (urlObj.protocol === 'https:') {
                result.isSecure = true;
                return result;
            } else if (urlObj.protocol === 'http:') {
                // 尝试升级到HTTPS
                urlObj.protocol = 'https:';
                result.upgradedUrl = urlObj.toString();
                result.wasUpgraded = true;
                result.isSecure = true;
                
                console.log(`HTTP升级到HTTPS: ${url} -> ${result.upgradedUrl}`);
                return result;
            } else {
                result.error = new Error(`不支持的协议: ${urlObj.protocol}`);
                return result;
            }
        } catch (error) {
            result.error = new Error(`URL验证失败: ${error.message}`);
            return result;
        }
    }

    /**
     * 验证URL是否使用HTTPS
     * @param {string} url - 要验证的URL
     * @returns {boolean} 是否使用HTTPS
     */
    validateHTTPS(url) {
        const result = this.validateAndUpgradeHTTPS(url);
        return result.isSecure && !result.wasUpgraded;
    }

    /**
     * 验证URL是否安全
     * @param {string} url - 要验证的URL
     * @returns {Object} 验证结果
     */
    validateURLSafety(url) {
        const result = {
            isValid: false,
            error: null,
            action: 'block'
        };

        if (!url || typeof url !== 'string') {
            result.error = new Error('URL不能为空或必须是字符串');
            return result;
        }

        // 检查是否包含危险协议
        for (const pattern of this.blockedPatterns) {
            if (pattern.test(url)) {
                const error = new Error(`检测到危险URL协议: ${url}`);
                result.error = error;
                
                // 使用错误处理器处理安全错误
                const securityResult = this.errorHandler.handleSecurityError(error);
                result.action = securityResult.action;
                
                console.warn('检测到危险URL协议:', url);
                return result;
            }
        }

        // 检查URL长度
        if (url.length > 2048) {
            result.error = new Error(`URL长度超过安全限制: ${url.length} 字符`);
            console.warn('URL长度超过安全限制:', url.length);
            return result;
        }

        // 尝试解析URL
        try {
            const urlObj = new URL(url);
            
            // 检查协议
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                result.error = new Error(`不支持的协议: ${urlObj.protocol}`);
                return result;
            }

            // 检查主机名
            if (!urlObj.hostname || urlObj.hostname.length === 0) {
                result.error = new Error('无效的主机名');
                return result;
            }

            result.isValid = true;
            return result;
            
        } catch (error) {
            result.error = new Error(`URL格式无效: ${error.message}`);
            return result;
        }
    }

    /**
     * 检查代理服务的安全性
     * @param {string} proxyURL - 代理服务URL
     * @returns {Promise<Object>} 验证结果
     */
    async validateProxyService(proxyURL) {
        const result = {
            isValid: false,
            error: null,
            canProceed: false
        };

        // 检查HTTPS
        if (!this.validateHTTPS(proxyURL)) {
            result.error = new Error('代理服务必须使用HTTPS');
            console.error('代理服务必须使用HTTPS:', proxyURL);
            return result;
        }

        // 检查URL安全性
        const urlValidation = this.validateURLSafety(proxyURL);
        if (!urlValidation.isValid) {
            result.error = urlValidation.error;
            console.error('代理服务URL不安全:', proxyURL);
            return result;
        }

        try {
            // 检查代理服务的可用性和安全性
            const operationId = `proxy-validation-${Date.now()}`;
            
            const validationFunction = async () => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                const response = await fetch(proxyURL, { 
                    method: 'HEAD',
                    mode: 'no-cors',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'WebBrowserDownloader/1.0 SecurityCheck'
                    }
                });

                clearTimeout(timeoutId);
                return response;
            };

            await this.errorHandler.handleNetworkError(
                new Error('Proxy validation'),
                operationId,
                validationFunction
            );

            result.isValid = true;
            result.canProceed = true;
            return result;

        } catch (error) {
            result.error = error;
            
            // 处理SSL/证书错误
            if (error.message.includes('certificate') || error.message.includes('SSL')) {
                const securityResult = this.errorHandler.handleSecurityError(error);
                result.canProceed = securityResult.canProceed;
                
                if (!securityResult.canProceed) {
                    console.error('代理服务SSL验证失败:', proxyURL, error.message);
                }
            }
            
            return result;
        }
    }

            // 检查响应头中的安全信息
            const securityHeaders = this.checkSecurityHeaders(response);
            if (!securityHeaders.secure) {
                console.warn('代理服务缺少安全头:', securityHeaders.missing);
            }

            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('代理服务响应超时:', proxyURL);
            } else {
                console.error('代理服务验证失败:', error);
            }
            return false;
        }
    }

    /**
     * 检查安全响应头
     * @param {Response} response - HTTP响应对象
     * @returns {Object} 安全检查结果
     */
    checkSecurityHeaders(response) {
        const securityHeaders = {
            'strict-transport-security': response.headers.get('strict-transport-security'),
            'x-content-type-options': response.headers.get('x-content-type-options'),
            'x-frame-options': response.headers.get('x-frame-options'),
            'x-xss-protection': response.headers.get('x-xss-protection')
        };

        const missing = [];
        const secure = Object.entries(securityHeaders).every(([header, value]) => {
            if (!value) {
                missing.push(header);
                return false;
            }
            return true;
        });

        return { secure, missing, headers: securityHeaders };
    }

    /**
     * 清理敏感数据
     * @param {string} content - 要清理的内容
     * @returns {Object} 清理结果
     */
    sanitizeContent(content) {
        const result = {
            originalContent: content,
            sanitizedContent: content,
            wasModified: false,
            removedPatterns: []
        };

        if (!content || typeof content !== 'string') {
            return result;
        }

        let sanitized = content;
        
        // 移除敏感信息模式
        for (const pattern of this.sensitivePatterns) {
            const matches = sanitized.match(pattern);
            if (matches) {
                result.removedPatterns.push({
                    pattern: pattern.toString(),
                    count: matches.length
                });
                result.wasModified = true;
            }

            sanitized = sanitized.replace(pattern, (match) => {
                const parts = match.split(/[=:]/);
                return parts[0] + (parts[1] ? '=***' : '');
            });
        }

        // 移除潜在的脚本注入
        const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
        if (scriptPattern.test(sanitized)) {
            result.wasModified = true;
            result.removedPatterns.push({
                pattern: 'script tags',
                count: (sanitized.match(scriptPattern) || []).length
            });
        }
        sanitized = sanitized.replace(scriptPattern, '');

        // 移除JavaScript协议
        if (/javascript:/gi.test(sanitized)) {
            result.wasModified = true;
            result.removedPatterns.push({
                pattern: 'javascript protocol',
                count: (sanitized.match(/javascript:/gi) || []).length
            });
        }
        sanitized = sanitized.replace(/javascript:/gi, 'javascript-blocked:');

        // 移除事件处理器
        if (/on\w+\s*=/gi.test(sanitized)) {
            result.wasModified = true;
            result.removedPatterns.push({
                pattern: 'event handlers',
                count: (sanitized.match(/on\w+\s*=/gi) || []).length
            });
        }
        sanitized = sanitized.replace(/on\w+\s*=/gi, 'on-event-blocked=');

        result.sanitizedContent = sanitized;

        // 使用ErrorHandler清理敏感数据
        if (result.wasModified) {
            const cleanedData = this.errorHandler.sanitizeData({
                originalLength: content.length,
                sanitizedLength: sanitized.length,
                removedPatterns: result.removedPatterns
            });
            
            console.log('内容已清理，移除了敏感信息:', cleanedData);
        }

        return result;
    }

    /**
     * 生成安全的文件名
     * @param {string} originalName - 原始文件名
     * @returns {string} 安全的文件名
     */
    generateSecureFilename(originalName) {
        if (!originalName || typeof originalName !== 'string') {
            return this.generateRandomFilename();
        }

        // 移除危险字符
        let safeName = originalName
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
            .replace(/^\.+/, '') // 移除开头的点
            .replace(/\.+$/, '') // 移除结尾的点
            .replace(/\s+/g, '_') // 替换空格
            .replace(/_+/g, '_') // 合并多个下划线
            .trim();

        // 检查是否为保留名称（Windows）
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];

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

        // 确保文件名不为空
        if (!safeName || safeName === '_') {
            return this.generateRandomFilename();
        }

        return safeName;
    }

    /**
     * 生成随机文件名
     * @param {string} extension - 文件扩展名
     * @returns {string} 随机文件名
     */
    generateRandomFilename(extension = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const ext = extension.startsWith('.') ? extension : (extension ? '.' + extension : '');
        return `download_${timestamp}_${random}${ext}`;
    }

    /**
     * 验证文件类型安全性
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     * @returns {boolean} 是否安全
     */
    validateFileTypeSafety(filename, mimeType) {
        // 危险的文件扩展名
        const dangerousExtensions = [
            '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
            '.app', '.deb', '.pkg', '.dmg', '.msi', '.run', '.sh', '.ps1'
        ];

        // 检查文件扩展名
        const ext = filename.toLowerCase().split('.').pop();
        if (dangerousExtensions.some(dangerous => dangerous.includes(ext))) {
            console.warn('检测到危险文件类型:', filename);
            return false;
        }

        // 检查MIME类型
        if (mimeType) {
            const dangerousMimeTypes = [
                'application/x-executable',
                'application/x-msdownload',
                'application/x-msdos-program',
                'text/javascript',
                'application/javascript'
            ];

            if (dangerousMimeTypes.includes(mimeType.toLowerCase())) {
                console.warn('检测到危险MIME类型:', mimeType);
                return false;
            }
        }

        return true;
    }

    /**
     * 清理HTTP请求头
     * @param {Object} headers - 原始请求头
     * @returns {Object} 清理后的请求头
     */
    sanitizeHeaders(headers) {
        const sanitized = {};
        const allowedHeaders = [
            'accept',
            'accept-language',
            'content-type',
            'user-agent',
            'referer'
        ];

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            if (allowedHeaders.includes(lowerKey)) {
                // 清理header值
                sanitized[key] = this.sanitizeHeaderValue(value);
            }
        }

        return sanitized;
    }

    /**
     * 清理请求头值
     * @param {string} value - 请求头值
     * @returns {string} 清理后的值
     */
    sanitizeHeaderValue(value) {
        if (!value || typeof value !== 'string') {
            return value;
        }

        // 移除控制字符和潜在的注入
        return value
            .replace(/[\x00-\x1f\x7f]/g, '') // 移除控制字符
            .replace(/\r\n/g, ' ') // 防止头注入
            .trim()
            .substring(0, 1000); // 限制长度
    }

    /**
     * 生成安全的随机数
     * @param {number} length - 随机数长度
     * @returns {string} 安全的随机字符串
     */
    generateSecureRandom(length = 16) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * 错误处理回调
     * @param {Function} callback - 错误处理回调函数
     */
    onError(callback) {
        this.errorCallback = callback;
    }

    /**
     * 报告安全事件
     * @param {string} event - 事件类型
     * @param {Object} details - 事件详情
     */
    reportSecurityEvent(event, details) {
        const securityEvent = {
            timestamp: new Date().toISOString(),
            event: event,
            details: details,
            userAgent: navigator.userAgent,
            url: location.href
        };

        console.warn('安全事件:', securityEvent);

        // 在实际应用中，这里可以发送到安全监控系统
        if (this.errorCallback) {
            this.errorCallback(new Error(`安全事件: ${event}`));
        }
    }
}