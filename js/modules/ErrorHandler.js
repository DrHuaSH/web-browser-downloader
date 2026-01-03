/**
 * 错误处理管理器 - 统一处理各种错误和恢复机制
 */
export class ErrorHandler {
    constructor() {
        this.retryAttempts = new Map(); // 跟踪重试次数
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1秒
        this.errorListeners = [];
        this.isOnline = navigator.onLine;
        
        this.setupNetworkMonitoring();
    }

    /**
     * 设置网络状态监控
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyNetworkRestore();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyNetworkLoss();
        });
    }

    /**
     * 处理网络错误
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作标识
     * @param {Function} retryFunction - 重试函数
     * @returns {Promise<any>} 处理结果
     */
    async handleNetworkError(error, operation, retryFunction) {
        const errorInfo = this.analyzeError(error);
        
        // 检查网络状态
        if (!this.isOnline) {
            throw new Error('网络连接已断开，请检查网络设置');
        }

        // 检查是否可以重试
        if (this.canRetry(operation, errorInfo)) {
            return await this.retryOperation(operation, retryFunction);
        }

        // 生成用户友好的错误消息
        const userMessage = this.generateUserFriendlyMessage(errorInfo);
        throw new Error(userMessage);
    }

    /**
     * 分析错误类型
     * @param {Error} error - 错误对象
     * @returns {Object} 错误信息
     */
    analyzeError(error) {
        const errorInfo = {
            type: 'unknown',
            isRetryable: false,
            severity: 'medium',
            originalError: error
        };

        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorInfo.type = 'network';
            errorInfo.isRetryable = true;
            errorInfo.severity = 'high';
        } else if (error.message.includes('timeout')) {
            errorInfo.type = 'timeout';
            errorInfo.isRetryable = true;
            errorInfo.severity = 'medium';
        } else if (error.message.includes('CORS')) {
            errorInfo.type = 'cors';
            errorInfo.isRetryable = false;
            errorInfo.severity = 'high';
        } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
            errorInfo.type = 'ssl';
            errorInfo.isRetryable = false;
            errorInfo.severity = 'high';
        } else if (error.message.includes('404')) {
            errorInfo.type = 'notfound';
            errorInfo.isRetryable = false;
            errorInfo.severity = 'low';
        } else if (error.message.includes('403') || error.message.includes('401')) {
            errorInfo.type = 'auth';
            errorInfo.isRetryable = false;
            errorInfo.severity = 'medium';
        } else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
            errorInfo.type = 'server';
            errorInfo.isRetryable = true;
            errorInfo.severity = 'high';
        }

        return errorInfo;
    }

    /**
     * 检查是否可以重试
     * @param {string} operation - 操作标识
     * @param {Object} errorInfo - 错误信息
     * @returns {boolean} 是否可以重试
     */
    canRetry(operation, errorInfo) {
        if (!errorInfo.isRetryable) {
            return false;
        }

        const attempts = this.retryAttempts.get(operation) || 0;
        return attempts < this.maxRetries;
    }

    /**
     * 重试操作
     * @param {string} operation - 操作标识
     * @param {Function} retryFunction - 重试函数
     * @returns {Promise<any>} 操作结果
     */
    async retryOperation(operation, retryFunction) {
        const attempts = this.retryAttempts.get(operation) || 0;
        this.retryAttempts.set(operation, attempts + 1);

        // 计算延迟时间（指数退避）
        const delay = this.retryDelay * Math.pow(2, attempts);
        
        console.log(`重试操作 ${operation}，第 ${attempts + 1} 次尝试，延迟 ${delay}ms`);
        
        await this.wait(delay);
        
        try {
            const result = await retryFunction();
            // 成功后清除重试计数
            this.retryAttempts.delete(operation);
            return result;
        } catch (error) {
            // 如果还能重试，递归调用
            if (this.canRetry(operation, this.analyzeError(error))) {
                return await this.retryOperation(operation, retryFunction);
            }
            throw error;
        }
    }

    /**
     * 生成用户友好的错误消息
     * @param {Object} errorInfo - 错误信息
     * @returns {string} 用户友好的消息
     */
    generateUserFriendlyMessage(errorInfo) {
        const messages = {
            network: '网络连接失败，请检查网络设置后重试',
            timeout: '请求超时，请稍后重试',
            cors: '跨域请求被阻止，请使用代理服务',
            ssl: 'SSL证书验证失败，请确认网站安全性',
            notfound: '请求的资源不存在',
            auth: '访问被拒绝，请检查权限设置',
            server: '服务器错误，请稍后重试',
            unknown: '发生未知错误，请稍后重试'
        };

        return messages[errorInfo.type] || messages.unknown;
    }

    /**
     * 处理移动设备特殊错误
     * @param {Error} error - 错误对象
     * @param {string} operation - 操作类型
     * @returns {string} 移动设备友好的错误消息
     */
    handleMobileError(error, operation) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) {
            return this.generateUserFriendlyMessage(this.analyzeError(error));
        }

        // iOS特殊处理
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            if (operation === 'download' && error.message.includes('blob')) {
                return 'iOS设备不支持直接下载，请长按链接选择"下载链接文件"';
            }
            if (error.message.includes('storage')) {
                return 'iOS设备存储空间不足，请清理后重试';
            }
        }

        // Android特殊处理
        if (/Android/.test(navigator.userAgent)) {
            if (operation === 'download' && error.message.includes('permission')) {
                return 'Android设备需要下载权限，请在设置中允许';
            }
            if (error.message.includes('storage')) {
                return 'Android设备存储空间不足，请清理后重试';
            }
        }

        // 通用移动设备错误
        if (error.message.includes('memory')) {
            return '设备内存不足，请关闭其他应用后重试';
        }

        return '移动设备发生错误，请重启应用后重试';
    }

    /**
     * 处理安全错误
     * @param {Error} error - 错误对象
     * @returns {Object} 处理结果
     */
    handleSecurityError(error) {
        const result = {
            canProceed: false,
            message: '',
            action: 'block'
        };

        if (error.message.includes('Mixed Content')) {
            result.message = '检测到混合内容（HTTP/HTTPS），已自动升级到HTTPS';
            result.action = 'upgrade';
            result.canProceed = true;
        } else if (error.message.includes('certificate')) {
            result.message = 'SSL证书验证失败，连接可能不安全';
            result.action = 'warn';
            result.canProceed = false;
        } else if (error.message.includes('CSP')) {
            result.message = '内容安全策略阻止了请求';
            result.action = 'block';
            result.canProceed = false;
        } else {
            result.message = '安全检查失败，操作已被阻止';
            result.action = 'block';
            result.canProceed = false;
        }

        return result;
    }

    /**
     * 清理敏感数据
     * @param {Object} data - 要清理的数据
     * @returns {Object} 清理后的数据
     */
    sanitizeData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'credential'];
        const cleaned = { ...data };

        for (const key in cleaned) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                cleaned[key] = '[REDACTED]';
            } else if (typeof cleaned[key] === 'object') {
                cleaned[key] = this.sanitizeData(cleaned[key]);
            }
        }

        return cleaned;
    }

    /**
     * 添加错误监听器
     * @param {Function} listener - 监听器函数
     */
    addErrorListener(listener) {
        this.errorListeners.push(listener);
    }

    /**
     * 移除错误监听器
     * @param {Function} listener - 监听器函数
     */
    removeErrorListener(listener) {
        const index = this.errorListeners.indexOf(listener);
        if (index > -1) {
            this.errorListeners.splice(index, 1);
        }
    }

    /**
     * 通知网络恢复
     */
    notifyNetworkRestore() {
        console.log('网络连接已恢复');
        this.errorListeners.forEach(listener => {
            try {
                listener({ type: 'network-restore', message: '网络连接已恢复' });
            } catch (error) {
                console.error('错误监听器执行失败:', error);
            }
        });
    }

    /**
     * 通知网络断开
     */
    notifyNetworkLoss() {
        console.log('网络连接已断开');
        this.errorListeners.forEach(listener => {
            try {
                listener({ type: 'network-loss', message: '网络连接已断开' });
            } catch (error) {
                console.error('错误监听器执行失败:', error);
            }
        });
    }

    /**
     * 等待指定时间
     * @param {number} ms - 毫秒数
     * @returns {Promise} Promise对象
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 重置重试计数
     * @param {string} operation - 操作标识
     */
    resetRetryCount(operation) {
        this.retryAttempts.delete(operation);
    }

    /**
     * 获取错误统计
     * @returns {Object} 错误统计信息
     */
    getErrorStats() {
        return {
            totalRetries: Array.from(this.retryAttempts.values()).reduce((sum, count) => sum + count, 0),
            activeOperations: this.retryAttempts.size,
            networkStatus: this.isOnline ? 'online' : 'offline'
        };
    }
}