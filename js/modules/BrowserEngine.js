/**
 * 浏览器引擎 - 处理网页加载和显示
 */
export class BrowserEngine {
    constructor(proxyService, securityManager) {
        this.securityManager = securityManager;
        this.currentURL = 'about:blank';
        this.pageChangeCallbacks = [];
        this.loadingCallbacks = [];
        this.errorCallbacks = [];
        this.isInitialized = false;
        this.isLoading = false;
        this.loadTimeout = 30000; // 30秒超时
        this.pageHistory = [];
        this.currentPageIndex = -1;
    }

    /**
     * 初始化浏览器引擎
     */
    async initialize() {
        this.iframe = document.getElementById('browser-iframe');
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        if (!this.iframe) {
            throw new Error('未找到浏览器iframe元素');
        }
        
        this.setupIframeListeners();
        this.setupNavigationControls();
        this.isInitialized = true;
        
        console.log('浏览器引擎初始化完成');
    }

    /**
     * 设置iframe监听器
     */
    setupIframeListeners() {
        // 页面加载开始
        this.iframe.addEventListener('loadstart', () => {
            this.isLoading = true;
            this.showLoadingOverlay();
            this.notifyLoadingChange(true);
        });

        // 页面加载完成
        this.iframe.addEventListener('load', () => {
            this.isLoading = false;
            this.hideLoadingOverlay();
            this.notifyLoadingChange(false);
            
            try {
                // 获取页面内容并通知变化
                const content = this.getCurrentPageContent();
                this.notifyPageChange(this.currentURL, content);
                console.log('页面加载完成:', this.currentURL);
            } catch (error) {
                console.error('获取页面内容失败:', error);
                this.notifyError('获取页面内容失败', error);
            }
        });

        // 页面加载错误
        this.iframe.addEventListener('error', (event) => {
            this.isLoading = false;
            this.hideLoadingOverlay();
            this.notifyLoadingChange(false);
            
            const errorMessage = '页面加载失败';
            console.error(errorMessage, event);
            this.notifyError(errorMessage, event);
        });

        // 监听iframe内的导航变化
        this.setupNavigationMonitoring();
    }

    /**
     * 设置导航监控
     */
    setupNavigationMonitoring() {
        // 定期检查iframe的URL变化
        this.navigationCheckInterval = setInterval(() => {
            try {
                if (this.iframe.contentWindow && this.iframe.contentWindow.location) {
                    const newURL = this.iframe.contentWindow.location.href;
                    if (newURL !== this.currentURL && newURL !== 'about:blank') {
                        this.currentURL = newURL;
                        this.updateAddressBar(newURL);
                        
                        // 添加到历史记录
                        this.addToHistory(newURL);
                        
                        // 通知URL变化
                        const content = this.getCurrentPageContent();
                        this.notifyPageChange(newURL, content);
                    }
                }
            } catch (error) {
                // 跨域访问限制，忽略错误
            }
        }, 1000);
    }

    /**
     * 设置导航控制
     */
    setupNavigationControls() {
        const goButton = document.getElementById('go-btn');
        const refreshButton = document.getElementById('refresh-btn');
        const urlInput = document.getElementById('url-input');

        if (goButton) {
            goButton.addEventListener('click', () => {
                const url = urlInput.value.trim();
                if (url) {
                    this.loadURL(url);
                }
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refresh();
            });
        }

        if (urlInput) {
            urlInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    const url = urlInput.value.trim();
                    if (url) {
                        this.loadURL(url);
                    }
                }
            });
        }
    }

    /**
     * 加载URL
     * @param {string} url - 要加载的URL
     */
    async loadURL(url) {
        if (!this.isInitialized) {
            throw new Error('浏览器引擎未初始化');
        }

        try {
            // 验证和清理URL
            const cleanUrl = this.validateAndCleanURL(url);
            
            // 安全检查 - 放宽HTTPS要求，允许HTTP用于测试
            let finalUrl = cleanUrl;
            if (!cleanUrl.startsWith('https://') && !cleanUrl.startsWith('http://')) {
                finalUrl = 'https://' + cleanUrl;
            }

            // 更新地址栏
            this.updateAddressBar(finalUrl);
            
            // 显示加载状态
            this.isLoading = true;
            this.showLoadingOverlay();
            this.notifyLoadingChange(true);

            // 设置加载超时
            const loadingTimeout = setTimeout(() => {
                if (this.isLoading) {
                    this.isLoading = false;
                    this.hideLoadingOverlay();
                    this.notifyLoadingChange(false);
                    this.notifyError('页面加载超时', new Error('Loading timeout'));
                }
            }, this.loadTimeout);

            // 直接加载网站（不使用代理）
            try {
                this.currentURL = finalUrl;
                this.iframe.src = finalUrl;
                console.log('直接加载URL:', finalUrl);
                
                // 等待一段时间检查是否加载成功
                await new Promise((resolve, reject) => {
                    // 监听iframe加载事件
                    const onLoad = () => {
                        this.iframe.removeEventListener('load', onLoad);
                        this.iframe.removeEventListener('error', onError);
                        clearTimeout(checkTimeout);
                        resolve();
                    };
                    
                    const onError = () => {
                        this.iframe.removeEventListener('load', onLoad);
                        this.iframe.removeEventListener('error', onError);
                        clearTimeout(checkTimeout);
                        reject(new Error('页面加载失败'));
                    };
                    
                    const checkTimeout = setTimeout(() => {
                        this.iframe.removeEventListener('load', onLoad);
                        this.iframe.removeEventListener('error', onError);
                        reject(new Error('加载超时'));
                    }, 10000);
                    
                    this.iframe.addEventListener('load', onLoad);
                    this.iframe.addEventListener('error', onError);
                });
                
            } catch (directLoadError) {
                console.log('直接加载失败:', directLoadError.message);
                // 显示友好的错误页面
                this.showErrorPage(finalUrl, '无法加载此页面。可能的原因：\n1. 网站不允许在iframe中显示\n2. 网络连接问题\n3. 网站服务器无响应');
            }

            // 添加到历史记录
            this.addToHistory(finalUrl);

            // 清除超时
            clearTimeout(loadingTimeout);
            
        } catch (error) {
            this.isLoading = false;
            this.hideLoadingOverlay();
            this.notifyLoadingChange(false);
            console.error('URL加载失败:', error);
            this.notifyError('URL加载失败: ' + error.message, error);
            throw error;
        }
    }

    /**
     * 验证和清理URL
     * @param {string} url - 原始URL
     * @returns {string} 清理后的URL
     */
    validateAndCleanURL(url) {
        let cleanUrl = url.trim();
        
        // 如果没有协议，添加https
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        
        // 验证URL格式
        try {
            const urlObj = new URL(cleanUrl);
            
            // 检查协议
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                throw new Error('不支持的协议: ' + urlObj.protocol);
            }
            
            // 检查主机名
            if (!urlObj.hostname) {
                throw new Error('无效的主机名');
            }
            
            return cleanUrl;
        } catch (error) {
            throw new Error('无效的URL格式: ' + error.message);
        }
    }

    /**
     * 刷新当前页面
     */
    refresh() {
        if (this.currentURL && this.currentURL !== 'about:blank') {
            this.loadURL(this.currentURL);
        }
    }

    /**
     * 后退
     */
    goBack() {
        if (this.currentPageIndex > 0) {
            this.currentPageIndex--;
            const url = this.pageHistory[this.currentPageIndex];
            this.loadURL(url);
        }
    }

    /**
     * 前进
     */
    goForward() {
        if (this.currentPageIndex < this.pageHistory.length - 1) {
            this.currentPageIndex++;
            const url = this.pageHistory[this.currentPageIndex];
            this.loadURL(url);
        }
    }

    /**
     * 添加到历史记录
     * @param {string} url - URL
     */
    addToHistory(url) {
        // 如果当前不在历史记录末尾，删除后面的记录
        if (this.currentPageIndex < this.pageHistory.length - 1) {
            this.pageHistory = this.pageHistory.slice(0, this.currentPageIndex + 1);
        }
        
        // 添加新URL（如果与当前URL不同）
        if (this.pageHistory[this.pageHistory.length - 1] !== url) {
            this.pageHistory.push(url);
            this.currentPageIndex = this.pageHistory.length - 1;
        }
        
        // 限制历史记录长度
        if (this.pageHistory.length > 100) {
            this.pageHistory = this.pageHistory.slice(-100);
            this.currentPageIndex = this.pageHistory.length - 1;
        }
    }

    /**
     * 更新地址栏
     * @param {string} url - URL
     */
    updateAddressBar(url) {
        const urlInput = document.getElementById('url-input');
        if (urlInput) {
            urlInput.value = url;
        }
    }

    /**
     * 显示加载覆盖层
     */
    showLoadingOverlay() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    /**
     * 隐藏加载覆盖层
     */
    hideLoadingOverlay() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('hidden');
        }
    }

    /**
     * 获取当前URL
     * @returns {string} 当前URL
     */
    getCurrentURL() {
        return this.currentURL;
    }

    /**
     * 获取当前页面内容
     * @returns {Object|null} 页面内容信息
     */
    getCurrentPageContent() {
        try {
            if (!this.iframe.contentDocument) {
                return null; // 跨域限制
            }
            
            const doc = this.iframe.contentDocument;
            const content = {
                title: doc.title || '',
                url: this.currentURL,
                text: doc.body ? doc.body.innerText : '',
                html: doc.documentElement ? doc.documentElement.outerHTML : '',
                links: this.extractLinks(doc),
                images: this.extractImages(doc),
                videos: this.extractVideos(doc),
                audios: this.extractAudios(doc),
                timestamp: Date.now()
            };
            
            return content;
        } catch (error) {
            console.warn('无法获取页面内容（可能是跨域限制）:', error);
            return null;
        }
    }

    /**
     * 提取页面链接
     * @param {Document} doc - 文档对象
     * @returns {Array} 链接数组
     */
    extractLinks(doc) {
        const links = [];
        const linkElements = doc.querySelectorAll('a[href]');
        
        linkElements.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                links.push({
                    url: this.resolveURL(href, this.currentURL),
                    text: link.textContent.trim(),
                    title: link.getAttribute('title') || ''
                });
            }
        });
        
        return links;
    }

    /**
     * 提取页面图片
     * @param {Document} doc - 文档对象
     * @returns {Array} 图片数组
     */
    extractImages(doc) {
        const images = [];
        const imgElements = doc.querySelectorAll('img[src]');
        
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                images.push({
                    url: this.resolveURL(src, this.currentURL),
                    alt: img.getAttribute('alt') || '',
                    title: img.getAttribute('title') || ''
                });
            }
        });
        
        return images;
    }

    /**
     * 提取页面视频
     * @param {Document} doc - 文档对象
     * @returns {Array} 视频数组
     */
    extractVideos(doc) {
        const videos = [];
        
        // HTML5 video元素
        const videoElements = doc.querySelectorAll('video[src], video source[src]');
        videoElements.forEach(video => {
            const src = video.getAttribute('src');
            if (src) {
                videos.push({
                    url: this.resolveURL(src, this.currentURL),
                    type: 'html5-video',
                    title: video.getAttribute('title') || ''
                });
            }
        });
        
        return videos;
    }

    /**
     * 提取页面音频
     * @param {Document} doc - 文档对象
     * @returns {Array} 音频数组
     */
    extractAudios(doc) {
        const audios = [];
        
        // HTML5 audio元素
        const audioElements = doc.querySelectorAll('audio[src], audio source[src]');
        audioElements.forEach(audio => {
            const src = audio.getAttribute('src');
            if (src) {
                audios.push({
                    url: this.resolveURL(src, this.currentURL),
                    type: 'html5-audio',
                    title: audio.getAttribute('title') || ''
                });
            }
        });
        
        return audios;
    }

    /**
     * 解析相对URL为绝对URL
     * @param {string} url - 相对或绝对URL
     * @param {string} baseURL - 基础URL
     * @returns {string} 绝对URL
     */
    resolveURL(url, baseURL) {
        try {
            return new URL(url, baseURL).href;
        } catch (error) {
            return url; // 如果解析失败，返回原URL
        }
    }

    /**
     * 注册页面变化监听器
     * @param {Function} callback - 回调函数
     */
    onPageChange(callback) {
        this.pageChangeCallbacks.push(callback);
    }

    /**
     * 注册加载状态变化监听器
     * @param {Function} callback - 回调函数
     */
    onLoadingChange(callback) {
        this.loadingCallbacks.push(callback);
    }

    /**
     * 注册错误监听器
     * @param {Function} callback - 回调函数
     */
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    /**
     * 通知页面变化
     * @param {string} url - 页面URL
     * @param {Object} content - 页面内容
     */
    notifyPageChange(url, content) {
        this.pageChangeCallbacks.forEach(callback => {
            try {
                callback(url, content);
            } catch (error) {
                console.error('页面变化回调错误:', error);
            }
        });
    }

    /**
     * 通知加载状态变化
     * @param {boolean} isLoading - 是否正在加载
     */
    notifyLoadingChange(isLoading) {
        this.loadingCallbacks.forEach(callback => {
            try {
                callback(isLoading);
            } catch (error) {
                console.error('加载状态变化回调错误:', error);
            }
        });
    }

    /**
     * 通知错误
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象
     */
    notifyError(message, error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(message, error);
            } catch (error) {
                console.error('错误回调错误:', error);
            }
        });
    }

    /**
     * 显示错误页面
     * @param {string} url - 尝试加载的URL
     * @param {string} message - 错误消息
     */
    showErrorPage(url, message) {
        const errorHTML = `
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>页面加载失败</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 40px 20px;
                        background: #f8f9fa;
                        color: #333;
                        text-align: center;
                    }
                    .error-container {
                        max-width: 600px;
                        margin: 0 auto;
                        background: white;
                        padding: 40px;
                        border-radius: 12px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .error-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                    }
                    .error-title {
                        font-size: 24px;
                        font-weight: 600;
                        margin-bottom: 16px;
                        color: #dc3545;
                    }
                    .error-message {
                        font-size: 16px;
                        line-height: 1.5;
                        margin-bottom: 24px;
                        white-space: pre-line;
                    }
                    .error-url {
                        background: #f8f9fa;
                        padding: 12px;
                        border-radius: 6px;
                        font-family: monospace;
                        word-break: break-all;
                        margin-bottom: 24px;
                    }
                    .retry-button {
                        background: #007acc;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-size: 16px;
                        cursor: pointer;
                        margin: 0 8px;
                    }
                    .retry-button:hover {
                        background: #005a9e;
                    }
                    .suggestions {
                        text-align: left;
                        margin-top: 32px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .suggestions h4 {
                        margin-top: 0;
                        color: #495057;
                    }
                    .suggestions ul {
                        margin: 0;
                        padding-left: 20px;
                    }
                    .suggestions li {
                        margin-bottom: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <div class="error-icon">🚫</div>
                    <div class="error-title">无法加载页面</div>
                    <div class="error-message">${message}</div>
                    <div class="error-url">${url}</div>
                    
                    <button class="retry-button" onclick="parent.location.reload()">
                        重新尝试
                    </button>
                    <button class="retry-button" onclick="parent.webBrowserDownloader.components.browserEngine.loadURL('https://www.example.com')">
                        访问示例网站
                    </button>
                    
                    <div class="suggestions">
                        <h4>💡 建议尝试：</h4>
                        <ul>
                            <li>检查网址是否正确</li>
                            <li>确保网络连接正常</li>
                            <li>尝试访问其他网站，如：
                                <br>• https://www.example.com
                                <br>• https://httpbin.org
                                <br>• https://jsonplaceholder.typicode.com
                            </li>
                            <li>许多网站不允许在iframe中显示（这是正常的安全措施）</li>
                            <li>如果是HTTP网站，请尝试HTTPS版本</li>
                            <li>本应用使用直通模式，无需代理服务</li>
                        </ul>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // 将错误页面内容设置为iframe的src
        this.iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML);
        this.isLoading = false;
        this.hideLoadingOverlay();
        this.notifyLoadingChange(false);
    }

    /**
     * 清理资源
     */
    destroy() {
        if (this.navigationCheckInterval) {
            clearInterval(this.navigationCheckInterval);
        }
        
        this.pageChangeCallbacks = [];
        this.loadingCallbacks = [];
        this.errorCallbacks = [];
    }
}