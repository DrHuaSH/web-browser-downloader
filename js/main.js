/**
 * Web浏览器下载器 - 主入口文件
 * 负责初始化应用和协调各个模块
 */

import { UIController } from './modules/UIController.js';
import { BrowserEngine } from './modules/BrowserEngine.js';
import { ContentDetector } from './modules/ContentDetector.js';
import { DownloadManager } from './modules/DownloadManager.js';
import { SecurityManager } from './modules/SecurityManager.js';
import { ProxyService } from './modules/ProxyService.js';
import { MobileAdaptationManager } from './modules/MobileAdaptationManager.js';
import { ErrorHandler } from './modules/ErrorHandler.js';

/**
 * 应用主类
 */
class WebBrowserDownloader {
    constructor() {
        this.components = {};
        this.isInitialized = false;
        this.errorHandler = new ErrorHandler();
    }

    /**
     * 初始化应用
     */
    async initialize() {
        try {
            console.log('正在初始化Web浏览器下载器...');

            // 设置全局错误处理
            this.setupGlobalErrorHandling();

            // 初始化各个组件（按依赖顺序）
            this.components.securityManager = new SecurityManager();
            this.components.proxyService = new ProxyService(this.components.securityManager);
            this.components.mobileManager = new MobileAdaptationManager();
            this.components.browserEngine = new BrowserEngine(this.components.securityManager, this.components.proxyService);
            this.components.contentDetector = new ContentDetector(this.components.securityManager);
            this.components.downloadManager = new DownloadManager(this.components.mobileManager);
            this.components.uiController = new UIController();

            // 设置组件间的依赖关系
            this.setupComponentDependencies();

            // 初始化所有组件
            await this.initializeComponents();

            // 设置事件监听器
            this.setupEventListeners();

            // 检测移动设备并适配界面
            this.components.mobileManager.adaptUIForMobile();

            this.isInitialized = true;
            console.log('Web浏览器下载器初始化完成');

            // 更新状态显示
            this.components.uiController.updateStatus('就绪');

        } catch (error) {
            console.error('应用初始化失败:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 监听未捕获的错误
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(event.error)
            );
            
            if (this.components.uiController) {
                this.components.uiController.showError(errorMessage);
            }
        });

        // 监听未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(event.reason)
            );
            
            if (this.components.uiController) {
                this.components.uiController.showError(errorMessage);
            }
            
            event.preventDefault();
        });

        // 监听网络状态变化
        this.errorHandler.addErrorListener((event) => {
            if (this.components.uiController) {
                if (event.type === 'network-loss') {
                    this.components.uiController.showError('网络连接已断开');
                    this.components.uiController.updateStatus('离线');
                } else if (event.type === 'network-restore') {
                    this.components.uiController.hideError();
                    this.components.uiController.updateStatus('已连接');
                }
            }
        });
    }

    /**
     * 设置组件间的依赖关系
     */
    setupComponentDependencies() {
        // 浏览器引擎监听页面变化，通知内容检测器
        this.components.browserEngine.onPageChange((url, content) => {
            this.components.contentDetector.analyzeContent(content, url);
        });

        // 内容检测器检测到内容时，更新UI按钮状态
        this.components.contentDetector.onContentDetected((detectedContent) => {
            this.components.uiController.updateButtonStates(detectedContent);
        });

        // 下载管理器进度更新时，更新UI显示
        this.components.downloadManager.onProgressUpdate((downloadId, progress) => {
            this.components.uiController.showDownloadProgress(downloadId, progress);
        });

        // 错误处理
        this.setupErrorHandling();
    }

    /**
     * 初始化所有组件
     */
    async initializeComponents() {
        const componentNames = Object.keys(this.components);
        const initializationOrder = [
            'securityManager',
            'proxyService', 
            'mobileManager',
            'browserEngine',
            'contentDetector',
            'downloadManager',
            'uiController'
        ];

        // 按正确顺序初始化组件
        for (const componentName of initializationOrder) {
            const component = this.components[componentName];
            if (component && typeof component.initialize === 'function') {
                try {
                    console.log(`正在初始化 ${componentName}...`);
                    await component.initialize();
                    console.log(`${componentName} 初始化完成`);
                } catch (error) {
                    console.error(`${componentName} 初始化失败:`, error);
                    
                    // 使用错误处理器处理初始化错误
                    const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                        this.errorHandler.analyzeError(error)
                    );
                    
                    throw new Error(`${componentName} 初始化失败: ${errorMessage}`);
                }
            }
        }

        // 验证所有组件都已初始化
        const uninitializedComponents = componentNames.filter(name => {
            const component = this.components[name];
            return component && !component.isInitialized;
        });

        if (uninitializedComponents.length > 0) {
            throw new Error(`以下组件未能正确初始化: ${uninitializedComponents.join(', ')}`);
        }

        console.log('所有组件初始化完成');
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // URL输入和导航
        const urlInput = document.getElementById('url-input');
        const goBtn = document.getElementById('go-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        goBtn.addEventListener('click', () => this.handleNavigation());
        refreshBtn.addEventListener('click', () => this.handleRefresh());
        
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleNavigation();
            }
        });

        // 下载按钮
        document.getElementById('media-download-btn').addEventListener('click', () => {
            this.handleMediaDownload();
        });

        document.getElementById('text-download-btn').addEventListener('click', () => {
            this.handleTextDownload();
        });

        document.getElementById('pdf-download-btn').addEventListener('click', () => {
            this.handlePDFDownload();
        });

        // 错误提示关闭
        document.getElementById('close-toast-btn').addEventListener('click', () => {
            this.components.uiController.hideError();
        });

        // 下载面板关闭
        document.getElementById('close-panel-btn').addEventListener('click', () => {
            this.components.uiController.hideDownloadPanel();
        });

        // 移动设备触摸事件
        this.components.mobileManager.handleTouchInteractions();
    }

    /**
     * 设置错误处理
     */
    setupErrorHandling() {
        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            this.components.uiController.showError('发生未知错误，请刷新页面重试');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            this.components.uiController.showError('网络请求失败，请检查网络连接');
        });

        // 组件错误处理
        Object.values(this.components).forEach(component => {
            if (typeof component.onError === 'function') {
                component.onError((error) => {
                    console.error('组件错误:', error);
                    this.components.uiController.showError(error.message || '操作失败');
                });
            }
        });
    }

    /**
     * 处理导航
     */
    async handleNavigation() {
        const urlInput = document.getElementById('url-input');
        const url = urlInput.value.trim();

        if (!url) {
            this.components.uiController.showError('请输入有效的网址');
            return;
        }

        try {
            // 安全验证
            const urlValidation = this.components.securityManager.validateURLSafety(url);
            if (!urlValidation.isValid) {
                throw urlValidation.error;
            }

            // HTTPS升级
            const httpsResult = this.components.securityManager.validateAndUpgradeHTTPS(url);
            const finalUrl = httpsResult.upgradedUrl;
            
            if (httpsResult.wasUpgraded) {
                this.components.uiController.updateStatus('已升级到HTTPS');
                urlInput.value = finalUrl;
            }

            this.components.uiController.showLoading(true);
            this.components.uiController.updateStatus('正在加载...');
            
            await this.components.browserEngine.loadURL(finalUrl);
            
            this.components.uiController.updateStatus('加载完成');
        } catch (error) {
            console.error('导航失败:', error);
            
            // 使用错误处理器生成用户友好的错误消息
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(error)
            );
            
            this.components.uiController.showError(errorMessage);
            this.components.uiController.updateStatus('加载失败');
        } finally {
            this.components.uiController.showLoading(false);
        }
    }

    /**
     * 处理刷新
     */
    async handleRefresh() {
        const currentUrl = this.components.browserEngine.getCurrentURL();
        if (currentUrl && currentUrl !== 'about:blank') {
            try {
                this.components.uiController.showLoading(true);
                this.components.uiController.updateStatus('正在刷新...');
                
                await this.components.browserEngine.loadURL(currentUrl);
                
                this.components.uiController.updateStatus('刷新完成');
            } catch (error) {
                console.error('刷新失败:', error);
                
                const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                    this.errorHandler.analyzeError(error)
                );
                
                this.components.uiController.showError(errorMessage);
                this.components.uiController.updateStatus('刷新失败');
            } finally {
                this.components.uiController.showLoading(false);
            }
        }
    }

    /**
     * 处理媒体下载
     */
    async handleMediaDownload() {
        try {
            const mediaFiles = this.components.contentDetector.getDetectedMedia();
            if (mediaFiles.length === 0) {
                this.components.uiController.showError('当前页面未检测到媒体文件');
                return;
            }

            this.components.uiController.showDownloadPanel('media', mediaFiles);
        } catch (error) {
            console.error('媒体下载失败:', error);
            
            const errorMessage = this.errorHandler.generateUserFriendlyMessage(
                this.errorHandler.analyzeError(error)
            );
            
            this.components.uiController.showError(errorMessage);
        }
    }

    /**
     * 处理文本下载
     */
    async handleTextDownload() {
        try {
            const textContent = this.components.contentDetector.getExtractedText();
            if (!textContent || !textContent.content) {
                this.components.uiController.showError('当前页面未检测到可提取的文本内容');
                return;
            }

            await this.components.downloadManager.downloadTextContent(
                textContent.content,
                textContent.title || 'webpage-content'
            );

            this.components.uiController.updateStatus('文本下载完成');
        } catch (error) {
            console.error('文本下载失败:', error);
            this.components.uiController.showError('文本下载失败: ' + error.message);
        }
    }

    /**
     * 处理PDF下载
     */
    async handlePDFDownload() {
        try {
            const pdfFiles = this.components.contentDetector.getDetectedPDFs();
            if (pdfFiles.length === 0) {
                this.components.uiController.showError('当前页面未检测到PDF文件');
                return;
            }

            this.components.uiController.showDownloadPanel('pdf', pdfFiles);
        } catch (error) {
            console.error('PDF下载失败:', error);
            this.components.uiController.showError('PDF下载失败: ' + error.message);
        }
    }

    /**
     * 处理初始化错误
     */
    handleInitializationError(error) {
        const errorMessage = `应用初始化失败: ${error.message}`;
        
        // 显示错误信息
        const errorElement = document.createElement('div');
        errorElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #dc3545;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 9999;
            max-width: 400px;
        `;
        errorElement.innerHTML = `
            <h3>初始化失败</h3>
            <p>${errorMessage}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #dc3545;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            ">重新加载</button>
        `;
        
        document.body.appendChild(errorElement);
    }
}

// 应用启动
document.addEventListener('DOMContentLoaded', async () => {
    const app = new WebBrowserDownloader();
    await app.initialize();
    
    // 将应用实例暴露到全局，便于调试
    window.webBrowserDownloader = app;
});