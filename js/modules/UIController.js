/**
 * UI控制器 - 管理用户界面和用户交互
 */
import { ErrorHandler } from './ErrorHandler.js';

export class UIController {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
        this.isMobile = false;
        this.downloadItems = new Map(); // 跟踪下载项目
        this.errorCallbacks = [];
        this.errorHandler = new ErrorHandler();
        
        // 设置错误处理监听器
        this.setupErrorHandling();
    }

    /**
     * 初始化UI控制器
     */
    async initialize() {
        this.detectMobileDevice();
        this.cacheElements();
        this.setupInitialState();
        this.setupResponsiveLayout();
        this.setupKeyboardShortcuts();
        this.isInitialized = true;
        console.log('UI控制器初始化完成');
    }

    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        // 监听网络状态变化
        this.errorHandler.addErrorListener((event) => {
            if (event.type === 'network-loss') {
                this.showError('网络连接已断开，请检查网络设置');
                this.updateStatus('网络断开');
            } else if (event.type === 'network-restore') {
                this.hideError();
                this.updateStatus('网络已恢复');
            }
        });

        // 监听全局错误
        window.addEventListener('error', (event) => {
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(event.error)
            );
            this.showError(errorMessage);
        });

        // 监听未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(event.reason)
            );
            this.showError(errorMessage);
            event.preventDefault(); // 阻止默认的控制台错误输出
        });
    }

    /**
     * 检测移动设备
     */
    detectMobileDevice() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        }
    }

    /**
     * 缓存DOM元素
     */
    cacheElements() {
        this.elements = {
            // 主容器
            app: document.getElementById('app'),
            toolbar: document.querySelector('.toolbar'),
            browserContainer: document.querySelector('.browser-container'),
            
            // 按钮
            mediaBtn: document.getElementById('media-download-btn'),
            textBtn: document.getElementById('text-download-btn'),
            pdfBtn: document.getElementById('pdf-download-btn'),
            goBtn: document.getElementById('go-btn'),
            refreshBtn: document.getElementById('refresh-btn'),
            
            // 状态显示
            statusText: document.getElementById('status-text'),
            
            // 加载覆盖层
            loadingOverlay: document.getElementById('loading-overlay'),
            
            // 下载面板
            downloadPanel: document.getElementById('download-panel'),
            downloadList: document.getElementById('download-list'),
            closePanelBtn: document.getElementById('close-panel-btn'),
            
            // 错误提示
            errorToast: document.getElementById('error-toast'),
            errorMessage: document.getElementById('error-message'),
            closeToastBtn: document.getElementById('close-toast-btn'),
            
            // 浏览器相关
            urlInput: document.getElementById('url-input'),
            browserIframe: document.getElementById('browser-iframe'),
            addressBar: document.querySelector('.address-bar')
        };

        // 验证关键元素存在
        this.validateElements();
    }

    /**
     * 验证关键DOM元素
     */
    validateElements() {
        const requiredElements = [
            'mediaBtn', 'textBtn', 'pdfBtn', 'statusText', 
            'loadingOverlay', 'downloadPanel', 'errorToast', 
            'urlInput', 'browserIframe'
        ];

        for (const elementKey of requiredElements) {
            if (!this.elements[elementKey]) {
                console.warn(`关键UI元素缺失: ${elementKey}`);
            }
        }
    }

    /**
     * 设置初始状态
     */
    setupInitialState() {
        // 初始化按钮状态
        this.updateButtonStates({
            hasMedia: false,
            hasText: false,
            hasPDF: false
        });
        
        // 隐藏所有面板
        this.hideDownloadPanel();
        this.hideError();
        this.showLoading(false);

        // 设置初始焦点
        if (this.elements.urlInput && !this.isMobile) {
            this.elements.urlInput.focus();
        }
    }

    /**
     * 设置响应式布局
     */
    setupResponsiveLayout() {
        // 监听窗口大小变化
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });

        // 初始布局调整
        this.handleResize();
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 移动设备布局调整
        if (width < 768) {
            this.applyMobileLayout();
        } else {
            this.applyDesktopLayout();
        }

        // 调整下载面板大小
        if (this.elements.downloadPanel && !this.elements.downloadPanel.classList.contains('hidden')) {
            this.adjustDownloadPanelSize();
        }
    }

    /**
     * 应用移动设备布局
     */
    applyMobileLayout() {
        if (this.elements.toolbar) {
            this.elements.toolbar.style.flexDirection = 'column';
            this.elements.toolbar.style.gap = '8px';
        }

        if (this.elements.addressBar) {
            this.elements.addressBar.style.flexDirection = 'column';
            this.elements.addressBar.style.gap = '8px';
        }

        // 调整按钮大小
        const buttons = document.querySelectorAll('.download-btn');
        buttons.forEach(btn => {
            btn.style.minHeight = '44px'; // 移动设备触摸友好的最小高度
            btn.style.fontSize = '14px';
        });
    }

    /**
     * 应用桌面布局
     */
    applyDesktopLayout() {
        if (this.elements.toolbar) {
            this.elements.toolbar.style.flexDirection = '';
            this.elements.toolbar.style.gap = '';
        }

        if (this.elements.addressBar) {
            this.elements.addressBar.style.flexDirection = '';
            this.elements.addressBar.style.gap = '';
        }

        // 恢复按钮默认大小
        const buttons = document.querySelectorAll('.download-btn');
        buttons.forEach(btn => {
            btn.style.minHeight = '';
            btn.style.fontSize = '';
        });
    }

    /**
     * 处理屏幕方向变化
     */
    handleOrientationChange() {
        // 重新计算布局
        this.handleResize();
        
        // 调整iframe高度
        if (this.elements.browserIframe) {
            const availableHeight = window.innerHeight - 
                (this.elements.toolbar ? this.elements.toolbar.offsetHeight : 0) -
                (this.elements.addressBar ? this.elements.addressBar.offsetHeight : 0) - 20;
            
            this.elements.browserIframe.style.height = `${availableHeight}px`;
        }
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + L: 聚焦地址栏
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                if (this.elements.urlInput) {
                    this.elements.urlInput.focus();
                    this.elements.urlInput.select();
                }
            }

            // F5 或 Ctrl/Cmd + R: 刷新
            if (event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key === 'r')) {
                event.preventDefault();
                if (this.elements.refreshBtn) {
                    this.elements.refreshBtn.click();
                }
            }

            // Escape: 关闭面板
            if (event.key === 'Escape') {
                this.hideDownloadPanel();
                this.hideError();
            }
        });
    }

    /**
     * 更新按钮状态
     * @param {Object} detectedContent - 检测到的内容
     */
    updateButtonStates(detectedContent) {
        if (!this.isInitialized) return;

        const { hasMedia, hasText, hasPDF, mediaCount, textLength, pdfCount } = detectedContent;

        // 更新媒体下载按钮
        this.updateButton(this.elements.mediaBtn, hasMedia, {
            count: mediaCount,
            badge: mediaCount ? `${mediaCount}` : '',
            tooltip: hasMedia ? `发现 ${mediaCount} 个媒体文件` : '未发现媒体文件'
        });

        // 更新文本下载按钮
        this.updateButton(this.elements.textBtn, hasText, {
            count: textLength,
            badge: textLength ? this.formatSize(textLength) : '',
            tooltip: hasText ? `文本内容 ${this.formatSize(textLength)}` : '未发现文本内容'
        });

        // 更新PDF下载按钮
        this.updateButton(this.elements.pdfBtn, hasPDF, {
            count: pdfCount,
            badge: pdfCount ? `${pdfCount}` : '',
            tooltip: hasPDF ? `发现 ${pdfCount} 个PDF文件` : '未发现PDF文件'
        });

        // 更新整体状态
        this.updateOverallStatus(detectedContent);
    }

    /**
     * 更新单个按钮状态
     * @param {HTMLElement} button - 按钮元素
     * @param {boolean} hasContent - 是否有内容
     * @param {Object} options - 选项
     */
    updateButton(button, hasContent, options = {}) {
        if (!button) return;

        const { count = 0, badge = '', tooltip = '' } = options;
        const wasDisabled = button.disabled;

        // 更新按钮状态
        button.disabled = !hasContent;
        
        // 添加/移除状态类
        if (hasContent) {
            button.classList.add('active');
            button.classList.remove('disabled');
            button.setAttribute('aria-label', button.textContent + (badge ? ` (${badge})` : ''));
        } else {
            button.classList.remove('active');
            button.classList.add('disabled');
            button.setAttribute('aria-label', button.textContent + ' - 无可用内容');
        }

        // 设置工具提示
        if (tooltip) {
            button.title = tooltip;
        }

        // 更新徽章显示
        this.updateButtonBadge(button, badge);

        // 添加状态变化动画
        if (wasDisabled !== button.disabled) {
            this.animateButtonStateChange(button, hasContent);
        }

        // 更新按钮的视觉反馈
        this.updateButtonVisualFeedback(button, hasContent, count);
    }

    /**
     * 更新按钮徽章
     * @param {HTMLElement} button - 按钮元素
     * @param {string} badge - 徽章文本
     */
    updateButtonBadge(button, badge) {
        let badgeElement = button.querySelector('.btn-badge');
        
        if (badge) {
            if (!badgeElement) {
                badgeElement = document.createElement('span');
                badgeElement.className = 'btn-badge';
                badgeElement.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #dc3545;
                    color: white;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 10px;
                    min-width: 16px;
                    text-align: center;
                    font-weight: bold;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                    z-index: 1;
                    transition: all 0.2s ease;
                `;
                button.style.position = 'relative';
                button.appendChild(badgeElement);
            }
            badgeElement.textContent = badge;
            
            // 添加徽章动画
            badgeElement.style.transform = 'scale(1.1)';
            setTimeout(() => {
                if (badgeElement) {
                    badgeElement.style.transform = 'scale(1)';
                }
            }, 150);
            
        } else if (badgeElement) {
            // 淡出动画
            badgeElement.style.opacity = '0';
            badgeElement.style.transform = 'scale(0.8)';
            setTimeout(() => {
                if (badgeElement && badgeElement.parentNode) {
                    badgeElement.remove();
                }
            }, 200);
        }
    }

    /**
     * 按钮状态变化动画
     * @param {HTMLElement} button - 按钮元素
     * @param {boolean} isActive - 是否激活
     */
    animateButtonStateChange(button, isActive) {
        // 添加状态变化动画类
        button.classList.add('state-changing');
        
        if (isActive) {
            // 激活动画
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
            
            setTimeout(() => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '';
                button.classList.remove('state-changing');
            }, 200);
        } else {
            // 禁用动画
            button.style.transform = 'scale(0.95)';
            button.style.opacity = '0.6';
            
            setTimeout(() => {
                button.style.transform = 'scale(1)';
                button.style.opacity = '';
                button.classList.remove('state-changing');
            }, 200);
        }
    }

    /**
     * 更新按钮视觉反馈
     * @param {HTMLElement} button - 按钮元素
     * @param {boolean} hasContent - 是否有内容
     * @param {number} count - 内容数量
     */
    updateButtonVisualFeedback(button, hasContent, count) {
        // 移除之前的反馈类
        button.classList.remove('low-content', 'medium-content', 'high-content');
        
        if (hasContent && count > 0) {
            // 根据内容数量添加不同的视觉反馈
            if (count >= 10) {
                button.classList.add('high-content');
            } else if (count >= 3) {
                button.classList.add('medium-content');
            } else {
                button.classList.add('low-content');
            }
        }
    }

    /**
     * 更新整体状态
     * @param {Object} detectedContent - 检测到的内容
     */
    updateOverallStatus(detectedContent) {
        const { hasMedia, hasText, hasPDF, mediaCount, textLength, pdfCount } = detectedContent;
        const totalItems = (mediaCount || 0) + (pdfCount || 0) + (hasText ? 1 : 0);
        
        let statusMessage = '';
        if (totalItems === 0) {
            statusMessage = '未检测到可下载内容';
        } else {
            const parts = [];
            if (hasMedia) parts.push(`${mediaCount}个媒体文件`);
            if (hasPDF) parts.push(`${pdfCount}个PDF文件`);
            if (hasText) parts.push('文本内容');
            
            statusMessage = `检测到: ${parts.join(', ')}`;
        }
        
        this.updateStatus(statusMessage);
        
        // 更新工具栏状态指示器
        this.updateToolbarIndicator(totalItems > 0);
    }

    /**
     * 更新工具栏状态指示器
     * @param {boolean} hasContent - 是否有内容
     */
    updateToolbarIndicator(hasContent) {
        if (!this.elements.toolbar) return;
        
        if (hasContent) {
            this.elements.toolbar.classList.add('has-content');
            this.elements.toolbar.classList.remove('no-content');
        } else {
            this.elements.toolbar.classList.remove('has-content');
            this.elements.toolbar.classList.add('no-content');
        }
    }

    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的大小
     */
    formatSize(bytes) {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
        return Math.round(bytes / (1024 * 1024)) + 'MB';
    }

    /**
     * 显示/隐藏加载状态
     * @param {boolean} show - 是否显示加载状态
     */
    showLoading(show) {
        if (!this.isInitialized || !this.elements.loadingOverlay) return;

        if (show) {
            this.elements.loadingOverlay.classList.remove('hidden');
            this.elements.loadingOverlay.setAttribute('aria-hidden', 'false');
        } else {
            this.elements.loadingOverlay.classList.add('hidden');
            this.elements.loadingOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * 更新状态文本
     * @param {string} status - 状态文本
     */
    updateStatus(status) {
        if (!this.isInitialized || !this.elements.statusText) return;
        
        this.elements.statusText.textContent = status;
        this.elements.statusText.setAttribute('aria-live', 'polite');
        
        // 在移动设备上显示临时通知
        if (this.isMobile && status !== '就绪') {
            this.showTemporaryNotification(status);
        }
    }

    /**
     * 显示临时通知（移动设备）
     * @param {string} message - 通知消息
     */
    showTemporaryNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            z-index: 10000;
            max-width: 80%;
            text-align: center;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 3000);
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        if (!this.isInitialized) return;

        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        
        if (this.elements.errorToast) {
            this.elements.errorToast.classList.remove('hidden');
            this.elements.errorToast.setAttribute('aria-hidden', 'false');
            this.elements.errorToast.setAttribute('role', 'alert');
        }

        // 5秒后自动隐藏
        setTimeout(() => {
            this.hideError();
        }, 5000);

        // 通知错误回调
        this.notifyError(message);
    }

    /**
     * 隐藏错误消息
     */
    hideError() {
        if (!this.isInitialized || !this.elements.errorToast) return;
        
        this.elements.errorToast.classList.add('hidden');
        this.elements.errorToast.setAttribute('aria-hidden', 'true');
    }

    /**
     * 显示下载面板
     * @param {string} type - 下载类型 ('media', 'pdf')
     * @param {Array} items - 下载项目列表
     */
    showDownloadPanel(type, items) {
        if (!this.isInitialized || !this.elements.downloadPanel) return;

        // 清空现有列表
        if (this.elements.downloadList) {
            this.elements.downloadList.innerHTML = '';
        }

        // 添加下载项目
        items.forEach((item, index) => {
            const itemElement = this.createDownloadItem(item, index, type);
            if (this.elements.downloadList) {
                this.elements.downloadList.appendChild(itemElement);
            }
        });

        // 显示面板
        this.elements.downloadPanel.classList.remove('hidden');
        this.elements.downloadPanel.setAttribute('aria-hidden', 'false');
        
        // 调整面板大小
        this.adjustDownloadPanelSize();
        
        // 聚焦到第一个下载按钮
        const firstDownloadBtn = this.elements.downloadList.querySelector('button');
        if (firstDownloadBtn && !this.isMobile) {
            firstDownloadBtn.focus();
        }
    }

    /**
     * 调整下载面板大小
     */
    adjustDownloadPanelSize() {
        if (!this.elements.downloadPanel) return;

        const maxHeight = window.innerHeight * 0.6;
        this.elements.downloadPanel.style.maxHeight = `${maxHeight}px`;
        
        if (this.elements.downloadList) {
            this.elements.downloadList.style.maxHeight = `${maxHeight - 60}px`;
            this.elements.downloadList.style.overflowY = 'auto';
        }
    }

    /**
     * 创建下载项目元素
     * @param {Object} item - 下载项目
     * @param {number} index - 项目索引
     * @param {string} type - 下载类型
     * @returns {HTMLElement} 下载项目元素
     */
    createDownloadItem(item, index, type) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'download-item';
        itemDiv.setAttribute('role', 'listitem');
        itemDiv.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            margin-bottom: 8px;
            background: #f8f9fa;
            transition: background-color 0.2s;
        `;

        // 悬停效果
        itemDiv.addEventListener('mouseenter', () => {
            itemDiv.style.backgroundColor = '#e9ecef';
        });
        itemDiv.addEventListener('mouseleave', () => {
            itemDiv.style.backgroundColor = '#f8f9fa';
        });

        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'flex: 1; margin-right: 12px; min-width: 0;';
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: 500; 
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        title.textContent = item.filename || item.title || `${type}_${index + 1}`;
        title.title = title.textContent; // 完整文本作为tooltip
        
        const details = document.createElement('div');
        details.style.cssText = 'font-size: 12px; color: #6c757d;';
        details.textContent = `${item.type || type} • ${item.size || '未知大小'}`;
        
        infoDiv.appendChild(title);
        infoDiv.appendChild(details);

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '下载';
        downloadBtn.setAttribute('aria-label', `下载 ${title.textContent}`);
        downloadBtn.style.cssText = `
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            min-height: ${this.isMobile ? '44px' : 'auto'};
            transition: background-color 0.2s;
        `;
        
        downloadBtn.addEventListener('mouseenter', () => {
            downloadBtn.style.backgroundColor = '#0056b3';
        });
        downloadBtn.addEventListener('mouseleave', () => {
            downloadBtn.style.backgroundColor = '#007bff';
        });
        
        downloadBtn.addEventListener('click', () => {
            this.handleItemDownload(item, type, downloadBtn);
        });

        itemDiv.appendChild(infoDiv);
        itemDiv.appendChild(downloadBtn);

        return itemDiv;
    }

    /**
     * 处理单个项目下载
     * @param {Object} item - 下载项目
     * @param {string} type - 下载类型
     * @param {HTMLElement} button - 下载按钮
     */
    async handleItemDownload(item, type, button) {
        try {
            // 禁用按钮防止重复点击
            button.disabled = true;
            button.textContent = '下载中...';
            
            const downloadId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.downloadItems.set(downloadId, { item, type, button });
            
            this.updateStatus(`正在下载 ${item.filename || item.title}...`);
            
            // 这里会调用下载管理器的相应方法
            // 暂时模拟下载过程
            await this.simulateDownload(downloadId, item);
            
        } catch (error) {
            console.error('下载失败:', error);
            this.showError('下载失败: ' + error.message);
            
            // 恢复按钮状态
            button.disabled = false;
            button.textContent = '下载';
        }
    }

    /**
     * 模拟下载过程
     * @param {string} downloadId - 下载ID
     * @param {Object} item - 下载项目
     */
    async simulateDownload(downloadId, item) {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                    
                    this.updateStatus('下载完成');
                    
                    // 恢复按钮状态
                    const downloadInfo = this.downloadItems.get(downloadId);
                    if (downloadInfo) {
                        downloadInfo.button.disabled = false;
                        downloadInfo.button.textContent = '下载';
                        downloadInfo.button.style.backgroundColor = '#28a745';
                        downloadInfo.button.textContent = '已完成';
                        
                        setTimeout(() => {
                            downloadInfo.button.style.backgroundColor = '#007bff';
                            downloadInfo.button.textContent = '下载';
                        }, 2000);
                    }
                    
                    this.downloadItems.delete(downloadId);
                    resolve();
                } else {
                    this.showDownloadProgress(downloadId, {
                        filename: item.filename || item.title,
                        percentage: progress
                    });
                }
            }, 200);
        });
    }

    /**
     * 隐藏下载面板
     */
    hideDownloadPanel() {
        if (!this.isInitialized || !this.elements.downloadPanel) return;
        
        this.elements.downloadPanel.classList.add('hidden');
        this.elements.downloadPanel.setAttribute('aria-hidden', 'true');
    }

    /**
     * 显示下载进度
     * @param {string} downloadId - 下载ID
     * @param {Object} progress - 进度信息
     */
    showDownloadProgress(downloadId, progress) {
        if (!this.isInitialized) return;

        // 更新状态显示
        const percentage = Math.round(progress.percentage || 0);
        this.updateStatus(`下载中: ${progress.filename} (${percentage}%)`);
        
        // 更新按钮显示
        const downloadInfo = this.downloadItems.get(downloadId);
        if (downloadInfo && downloadInfo.button) {
            downloadInfo.button.textContent = `${percentage}%`;
        }
    }

    /**
     * 注册错误监听器
     * @param {Function} callback - 回调函数
     */
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    /**
     * 通知错误
     * @param {string} message - 错误消息
     */
    notifyError(message) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(message);
            } catch (error) {
                console.error('错误回调执行失败:', error);
            }
        });
    }

    /**
     * 清理资源
     */
    destroy() {
        // 清理事件监听器
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('orientationchange', this.handleOrientationChange);
        
        // 清理下载项目
        this.downloadItems.clear();
        
        // 清理回调
        this.errorCallbacks = [];
    }
}