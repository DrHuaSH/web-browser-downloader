/**
 * 移动适配管理器 - 处理移动设备的特殊需求和限制
 */
import { ErrorHandler } from './ErrorHandler.js';

export class MobileAdaptationManager {
    constructor() {
        this.deviceInfo = null;
        this.isInitialized = false;
        this.errorHandler = new ErrorHandler();
        this.storageQuota = null;
        this.downloadLimitations = new Map();
    }

    /**
     * 初始化移动适配管理器
     */
    async initialize() {
        this.deviceInfo = this.detectDeviceAndBrowser();
        this.isInitialized = true;
        console.log('移动适配管理器初始化完成', this.deviceInfo);
    }

    /**
     * 检测设备类型和浏览器
     * @returns {Object} 设备信息
     */
    detectDeviceAndBrowser() {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;
        
        const deviceInfo = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isIOS: /iPad|iPhone|iPod/.test(userAgent),
            isAndroid: /Android/.test(userAgent),
            isTablet: /iPad/.test(userAgent) || (/Android/.test(userAgent) && !/Mobile/.test(userAgent)),
            browser: this.detectBrowser(userAgent),
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };

        return deviceInfo;
    }

    /**
     * 检测浏览器类型
     * @param {string} userAgent - 用户代理字符串
     * @returns {string} 浏览器类型
     */
    detectBrowser(userAgent) {
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            return 'chrome';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'safari';
        } else if (userAgent.includes('Firefox')) {
            return 'firefox';
        } else if (userAgent.includes('Edg')) {
            return 'edge';
        } else {
            return 'unknown';
        }
    }

    /**
     * 适配移动设备的下载方法
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Object} deviceInfo - 设备信息
     * @param {Function} progressCallback - 进度回调
     */
    async adaptDownloadForMobile(url, filename, deviceInfo = this.deviceInfo, progressCallback) {
        const operationId = `mobile-download-${Date.now()}`;
        
        const downloadFunction = async () => {
            // 检查存储空间
            await this.checkStorageQuota();
            
            // 检查下载限制
            this.checkDownloadLimitations(deviceInfo);
            
            if (deviceInfo.isIOS) {
                // iOS设备：在新标签页中打开文件
                return await this.handleIOSDownload(url, filename, progressCallback);
            } else if (deviceInfo.isAndroid) {
                // Android设备：使用标准下载API
                return await this.handleAndroidDownload(url, filename, progressCallback);
            } else {
                // 桌面设备：使用标准下载
                return await this.handleDesktopDownload(url, filename, progressCallback);
            }
        };

        try {
            return await this.errorHandler.handleNetworkError(
                new Error('Mobile download preparation'),
                operationId,
                downloadFunction
            );
        } catch (error) {
            // 处理移动设备特殊错误
            const mobileErrorMessage = this.errorHandler.handleMobileError(error, 'download');
            
            // 显示移动设备友好的错误提示
            this.showMobileErrorDialog(mobileErrorMessage, deviceInfo);
            
            throw new Error(mobileErrorMessage);
        }
    }

    /**
     * 检查存储配额
     */
    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                this.storageQuota = estimate;
                
                const usedPercentage = (estimate.usage / estimate.quota) * 100;
                
                if (usedPercentage > 90) {
                    throw new Error('设备存储空间不足，请清理后重试');
                } else if (usedPercentage > 80) {
                    console.warn('设备存储空间即将不足');
                }
            } catch (error) {
                console.warn('无法检查存储配额:', error);
            }
        }
    }

    /**
     * 检查下载限制
     * @param {Object} deviceInfo - 设备信息
     */
    checkDownloadLimitations(deviceInfo) {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        // 清理过期的限制记录
        for (const [key, timestamp] of this.downloadLimitations.entries()) {
            if (now - timestamp > oneHour) {
                this.downloadLimitations.delete(key);
            }
        }
        
        // iOS特殊限制
        if (deviceInfo.isIOS) {
            const iosDownloads = Array.from(this.downloadLimitations.keys())
                .filter(key => key.startsWith('ios-')).length;
                
            if (iosDownloads > 10) {
                throw new Error('iOS设备每小时下载次数限制，请稍后重试');
            }
            
            this.downloadLimitations.set(`ios-${now}`, now);
        }
        
        // Android特殊限制
        if (deviceInfo.isAndroid) {
            const androidDownloads = Array.from(this.downloadLimitations.keys())
                .filter(key => key.startsWith('android-')).length;
                
            if (androidDownloads > 20) {
                throw new Error('Android设备每小时下载次数限制，请稍后重试');
            }
            
            this.downloadLimitations.set(`android-${now}`, now);
        }
    }

    /**
     * 显示移动设备错误对话框
     * @param {string} errorMessage - 错误消息
     * @param {Object} deviceInfo - 设备信息
     */
    showMobileErrorDialog(errorMessage, deviceInfo) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 12px;
            max-width: 350px;
            width: 100%;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        `;
        
        const deviceIcon = deviceInfo.isIOS ? '📱' : deviceInfo.isAndroid ? '🤖' : '💻';
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">${deviceIcon}</div>
            <h3 style="margin: 0 0 16px 0; color: #333;">下载遇到问题</h3>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">${errorMessage}</p>
            <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 16px;
                width: 100%;
            ">知道了</button>
        `;
        
        dialog.appendChild(content);
        document.body.appendChild(dialog);
        
        // 5秒后自动关闭
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.parentNode.removeChild(dialog);
            }
        }, 5000);
    }

    /**
     * 处理iOS设备下载
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Function} progressCallback - 进度回调
     */
    async handleIOSDownload(url, filename, progressCallback) {
        try {
            // 检查iOS版本和Safari限制
            const iosVersion = this.getIOSVersion();
            if (iosVersion && iosVersion < 13) {
                throw new Error('iOS版本过低，建议升级到iOS 13或更高版本');
            }
            
            // 检查是否在Safari中
            const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            if (!isSafari) {
                console.warn('建议在Safari浏览器中下载以获得最佳体验');
            }
            
            if (progressCallback) {
                progressCallback(0, 100);
            }
            
            // 在新标签页中打开文件
            const newWindow = window.open(url, '_blank');
            
            if (!newWindow) {
                throw new Error('无法打开新窗口，请检查弹窗拦截设置');
            }

            if (progressCallback) {
                progressCallback(100, 100);
            }

            // 显示iOS特定的提示
            this.showIOSDownloadInstructions(filename);
            
        } catch (error) {
            console.error('iOS下载失败:', error);
            
            // 提供iOS特定的错误处理建议
            if (error.message.includes('弹窗')) {
                throw new Error('iOS设备被阻止打开新窗口，请在设置中允许弹窗');
            } else if (error.message.includes('版本')) {
                throw new Error(error.message);
            } else {
                throw new Error('iOS设备下载失败，请尝试长按链接选择"下载链接文件"');
            }
        }
    }

    /**
     * 获取iOS版本
     * @returns {number|null} iOS版本号
     */
    getIOSVersion() {
        const match = navigator.userAgent.match(/OS (\d+)_/);
        return match ? parseInt(match[1]) : null;
    }

    /**
     * 显示iOS下载说明
     * @param {string} filename - 文件名
     */
    showIOSDownloadInstructions(filename) {
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            text-align: center;
        `;
        
        instructions.innerHTML = `
            <h3>iOS下载说明</h3>
            <p>文件已在新标签页中打开</p>
            <p>请使用以下方式保存 <strong>${filename}</strong>:</p>
            <ul style="text-align: left; margin: 10px 0;">
                <li>点击分享按钮 📤</li>
                <li>选择"存储到文件"</li>
                <li>或长按内容进行复制</li>
            </ul>
            <button onclick="this.parentElement.remove()" style="
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            ">知道了</button>
        `;
        
        document.body.appendChild(instructions);
        
        // 5秒后自动移除
        setTimeout(() => {
            if (instructions.parentElement) {
                instructions.remove();
            }
        }, 5000);
    }

    /**
     * 处理Android设备下载
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Function} progressCallback - 进度回调
     */
    async handleAndroidDownload(url, filename, progressCallback) {
        try {
            // 检查Android版本和权限
            const androidVersion = this.getAndroidVersion();
            if (androidVersion && androidVersion < 6) {
                console.warn('Android版本较低，下载功能可能受限');
            }
            
            // 检查下载权限
            if ('permissions' in navigator) {
                try {
                    const permission = await navigator.permissions.query({name: 'downloads'});
                    if (permission.state === 'denied') {
                        throw new Error('Android设备需要下载权限，请在设置中允许');
                    }
                } catch (permError) {
                    console.warn('无法检查下载权限:', permError);
                }
            }
            
            if (progressCallback) {
                progressCallback(0, 100);
            }
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            if (progressCallback) {
                progressCallback(100, 100);
            }
            
            // 显示Android下载提示
            this.showAndroidDownloadNotification(filename);
            
        } catch (error) {
            console.error('Android下载失败:', error);
            
            // 提供Android特定的错误处理
            if (error.message.includes('权限')) {
                throw error;
            } else if (error.message.includes('存储')) {
                throw new Error('Android设备存储空间不足，请清理后重试');
            } else {
                // 回退到在新标签页打开
                console.log('回退到新标签页打开');
                window.open(url, '_blank');
                throw new Error('Android设备下载失败，已在新标签页打开文件');
            }
        }
    }

    /**
     * 获取Android版本
     * @returns {number|null} Android版本号
     */
    getAndroidVersion() {
        const match = navigator.userAgent.match(/Android (\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    /**
     * 显示Android下载通知
     * @param {string} filename - 文件名
     */
    showAndroidDownloadNotification(filename) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            max-width: 300px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        notification.innerHTML = `
            <div>📥 ${filename}</div>
            <div style="font-size: 12px; margin-top: 4px;">下载已开始，请查看通知栏</div>
        `;
        
        document.body.appendChild(notification);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * 处理桌面设备下载
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     */
    async handleDesktopDownload(url, filename) {
        try {
            // 标准下载方法
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('桌面下载失败:', error);
            throw error;
        }
    }

    /**
     * 处理触摸事件
     */
    handleTouchInteractions() {
        if (!this.deviceInfo.touchSupport) return;

        // 为按钮添加触摸反馈
        const buttons = document.querySelectorAll('button, .download-btn');
        
        buttons.forEach(button => {
            button.addEventListener('touchstart', (e) => {
                button.style.transform = 'scale(0.95)';
                button.style.opacity = '0.8';
            });
            
            button.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    button.style.transform = '';
                    button.style.opacity = '';
                }, 100);
            });
        });

        // 防止双击缩放
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    /**
     * 适配移动界面布局
     */
    adaptUIForMobile() {
        if (!this.deviceInfo.isMobile) return;

        // 添加移动设备特定的CSS类
        document.body.classList.add('mobile-device');
        
        if (this.deviceInfo.isIOS) {
            document.body.classList.add('ios-device');
        } else if (this.deviceInfo.isAndroid) {
            document.body.classList.add('android-device');
        }

        // 调整viewport
        this.adjustViewport();
        
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.adjustViewport();
            }, 100);
        });
    }

    /**
     * 调整viewport
     */
    adjustViewport() {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
    }

    /**
     * 错误处理回调
     * @param {Function} callback - 错误处理回调函数
     */
    onError(callback) {
        this.errorCallback = callback;
    }
}