import { HTMLToMarkdownConverter } from './HTMLToMarkdownConverter.js';

/**
 * 内容检测器 - 检测页面中的可下载内容
 */
export class ContentDetector {
    constructor() {
        this.detectedContent = {
            media: [],
            text: null,
            pdfs: []
        };
        this.contentCallbacks = [];
        this.errorCallbacks = [];
        this.isInitialized = false;
        this.networkRequests = new Map(); // 跟踪网络请求
        this.htmlToMarkdownConverter = new HTMLToMarkdownConverter(); // HTML转Markdown转换器
        this.mediaExtensions = new Set([
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v',
            'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
            'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'
        ]);
        this.videoExtensions = new Set(['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v']);
        this.audioExtensions = new Set(['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']);
        this.imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico']);
    }

    /**
     * 初始化内容检测器
     */
    async initialize() {
        await this.htmlToMarkdownConverter.initialize();
        this.startNetworkMonitoring();
        this.isInitialized = true;
        console.log('内容检测器初始化完成');
    }

    /**
     * 分析页面内容
     * @param {Object} pageContent - 页面内容对象
     * @param {string} url - 页面URL
     */
    analyzeContent(pageContent, url) {
        if (!this.isInitialized || !pageContent) {
            console.warn('内容检测器未初始化或页面内容为空');
            return;
        }

        console.log('开始分析页面内容:', url);
        
        // 重置检测结果
        this.detectedContent = {
            media: [],
            text: null,
            pdfs: []
        };

        try {
            // 检测媒体文件
            this.detectedContent.media = this.detectMediaFiles(pageContent);
            
            // 检测PDF文件
            this.detectedContent.pdfs = this.detectPDFFiles(pageContent);
            
            // 提取文本内容
            this.detectedContent.text = this.extractTextContent(pageContent, url);

            // 通知内容检测完成
            this.notifyContentDetected({
                hasMedia: this.detectedContent.media.length > 0,
                hasText: this.detectedContent.text !== null,
                hasPDF: this.detectedContent.pdfs.length > 0,
                mediaCount: this.detectedContent.media.length,
                textLength: this.detectedContent.text ? this.detectedContent.text.content.length : 0,
                pdfCount: this.detectedContent.pdfs.length
            });

            console.log(`内容检测完成: 媒体=${this.detectedContent.media.length}, PDF=${this.detectedContent.pdfs.length}, 文本=${this.detectedContent.text ? '是' : '否'}`);

        } catch (error) {
            console.error('内容分析失败:', error);
            this.notifyError('内容分析失败: ' + error.message, error);
        }
    }

    /**
     * 检测媒体文件
     * @param {Object} pageContent - 页面内容对象
     * @returns {Array} 检测到的媒体文件
     */
    detectMediaFiles(pageContent) {
        const mediaFiles = [];
        
        try {
            // 从页面链接中检测媒体文件
            if (pageContent.links && Array.isArray(pageContent.links)) {
                pageContent.links.forEach(link => {
                    const mediaInfo = this.analyzeMediaURL(link.url, link.text);
                    if (mediaInfo) {
                        mediaFiles.push({
                            ...mediaInfo,
                            source: 'link',
                            title: link.text || mediaInfo.filename,
                            originalUrl: link.url
                        });
                    }
                });
            }

            // 从页面图片中检测
            if (pageContent.images && Array.isArray(pageContent.images)) {
                pageContent.images.forEach(image => {
                    const mediaInfo = this.analyzeMediaURL(image.url, image.alt);
                    if (mediaInfo) {
                        mediaFiles.push({
                            ...mediaInfo,
                            source: 'image',
                            title: image.alt || image.title || mediaInfo.filename,
                            originalUrl: image.url
                        });
                    }
                });
            }

            // 从页面视频中检测
            if (pageContent.videos && Array.isArray(pageContent.videos)) {
                pageContent.videos.forEach(video => {
                    const mediaInfo = this.analyzeMediaURL(video.url, video.title);
                    if (mediaInfo) {
                        mediaFiles.push({
                            ...mediaInfo,
                            source: 'video',
                            title: video.title || mediaInfo.filename,
                            originalUrl: video.url
                        });
                    }
                });
            }

            // 从页面音频中检测
            if (pageContent.audios && Array.isArray(pageContent.audios)) {
                pageContent.audios.forEach(audio => {
                    const mediaInfo = this.analyzeMediaURL(audio.url, audio.title);
                    if (mediaInfo) {
                        mediaFiles.push({
                            ...mediaInfo,
                            source: 'audio',
                            title: audio.title || mediaInfo.filename,
                            originalUrl: audio.url
                        });
                    }
                });
            }

            // 从网络请求中检测媒体文件
            this.networkRequests.forEach((request, url) => {
                const mediaInfo = this.analyzeMediaURL(url);
                if (mediaInfo && request.contentType) {
                    mediaFiles.push({
                        ...mediaInfo,
                        source: 'network',
                        title: mediaInfo.filename,
                        originalUrl: url,
                        contentType: request.contentType,
                        size: request.contentLength || '未知大小'
                    });
                }
            });

            // 去重和排序
            return this.deduplicateAndSortMedia(mediaFiles);

        } catch (error) {
            console.error('媒体文件检测失败:', error);
            return [];
        }
    }

    /**
     * 分析媒体URL
     * @param {string} url - URL
     * @param {string} title - 标题
     * @returns {Object|null} 媒体信息
     */
    analyzeMediaURL(url, title = '') {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const filename = pathname.split('/').pop() || 'unknown';
            const extension = filename.split('.').pop();

            if (!extension || !this.mediaExtensions.has(extension)) {
                return null;
            }

            let mediaType = 'unknown';
            if (this.videoExtensions.has(extension)) {
                mediaType = 'video';
            } else if (this.audioExtensions.has(extension)) {
                mediaType = 'audio';
            } else if (this.imageExtensions.has(extension)) {
                mediaType = 'image';
            }

            return {
                url: url,
                filename: filename,
                extension: extension,
                type: mediaType,
                title: title || filename,
                size: '未知大小'
            };

        } catch (error) {
            return null;
        }
    }

    /**
     * 去重和排序媒体文件
     * @param {Array} mediaFiles - 媒体文件数组
     * @returns {Array} 去重排序后的媒体文件
     */
    deduplicateAndSortMedia(mediaFiles) {
        // 使用URL作为唯一标识符去重
        const uniqueMedia = new Map();
        
        mediaFiles.forEach(media => {
            const key = media.originalUrl;
            if (!uniqueMedia.has(key) || 
                (uniqueMedia.get(key).source === 'link' && media.source !== 'link')) {
                uniqueMedia.set(key, media);
            }
        });

        // 转换为数组并排序
        return Array.from(uniqueMedia.values()).sort((a, b) => {
            // 按类型排序：video > audio > image
            const typeOrder = { video: 0, audio: 1, image: 2, unknown: 3 };
            const aOrder = typeOrder[a.type] || 3;
            const bOrder = typeOrder[b.type] || 3;
            
            if (aOrder !== bOrder) {
                return aOrder - bOrder;
            }
            
            // 同类型按文件名排序
            return a.filename.localeCompare(b.filename);
        });
    }

    /**
     * 检测PDF文件
     * @param {Object} pageContent - 页面内容对象
     * @returns {Array} 检测到的PDF文件
     */
    detectPDFFiles(pageContent) {
        const pdfFiles = [];
        
        try {
            // 从页面链接中检测PDF文件
            if (pageContent.links && Array.isArray(pageContent.links)) {
                pageContent.links.forEach(link => {
                    if (this.isPDFURL(link.url)) {
                        pdfFiles.push({
                            url: link.url,
                            filename: this.extractFilename(link.url),
                            title: link.text || this.extractFilename(link.url),
                            source: 'link',
                            type: 'pdf',
                            size: '未知大小'
                        });
                    }
                });
            }

            // 从网络请求中检测PDF文件
            this.networkRequests.forEach((request, url) => {
                if (this.isPDFURL(url) || (request.contentType && request.contentType.includes('application/pdf'))) {
                    pdfFiles.push({
                        url: url,
                        filename: this.extractFilename(url),
                        title: this.extractFilename(url),
                        source: 'network',
                        type: 'pdf',
                        size: request.contentLength || '未知大小',
                        contentType: request.contentType
                    });
                }
            });

            // 去重
            return this.deduplicatePDFs(pdfFiles);

        } catch (error) {
            console.error('PDF文件检测失败:', error);
            return [];
        }
    }

    /**
     * 检查是否为PDF URL
     * @param {string} url - URL
     * @returns {boolean} 是否为PDF
     */
    isPDFURL(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            return pathname.endsWith('.pdf') || 
                   urlObj.search.includes('.pdf') ||
                   urlObj.search.includes('type=pdf');
        } catch (error) {
            return false;
        }
    }

    /**
     * 提取文件名
     * @param {string} url - URL
     * @returns {string} 文件名
     */
    extractFilename(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop();
            return filename || 'document.pdf';
        } catch (error) {
            return 'document.pdf';
        }
    }

    /**
     * 去重PDF文件
     * @param {Array} pdfFiles - PDF文件数组
     * @returns {Array} 去重后的PDF文件
     */
    deduplicatePDFs(pdfFiles) {
        const uniquePDFs = new Map();
        
        pdfFiles.forEach(pdf => {
            const key = pdf.url;
            if (!uniquePDFs.has(key)) {
                uniquePDFs.set(key, pdf);
            }
        });

        return Array.from(uniquePDFs.values()).sort((a, b) => 
            a.filename.localeCompare(b.filename)
        );
    }

    /**
     * 提取文本内容
     * @param {Object} pageContent - 页面内容对象
     * @param {string} url - 页面URL
     * @returns {Object|null} 提取的文本内容
     */
    extractTextContent(pageContent, url) {
        try {
            if (!pageContent.text && !pageContent.html) {
                return null;
            }

            // 提取纯文本内容
            let textContent = pageContent.text || '';
            
            // 如果没有纯文本，从HTML中提取
            if (!textContent && pageContent.html) {
                textContent = this.extractTextFromHTML(pageContent.html);
            }

            // 清理和格式化文本
            textContent = this.cleanAndFormatText(textContent);

            if (!textContent || textContent.length < 100) {
                return null; // 内容太少，不值得下载
            }

            return {
                title: pageContent.title || this.extractTitleFromURL(url),
                content: textContent,
                url: url,
                wordCount: this.countWords(textContent),
                characterCount: textContent.length,
                format: 'text',
                timestamp: Date.now(),
                // 添加Markdown格式
                markdown: this.convertToMarkdown(pageContent, textContent)
            };

        } catch (error) {
            console.error('文本内容提取失败:', error);
            return null;
        }
    }

    /**
     * 从HTML中提取文本
     * @param {string} html - HTML内容
     * @returns {string} 提取的文本
     */
    extractTextFromHTML(html) {
        try {
            // 创建临时DOM元素来解析HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // 移除脚本和样式标签
            const scripts = tempDiv.querySelectorAll('script, style, noscript');
            scripts.forEach(element => element.remove());

            // 提取文本内容
            return tempDiv.textContent || tempDiv.innerText || '';

        } catch (error) {
            console.error('HTML文本提取失败:', error);
            return '';
        }
    }

    /**
     * 清理和格式化文本
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    cleanAndFormatText(text) {
        if (!text) return '';

        return text
            // 移除多余的空白字符
            .replace(/\s+/g, ' ')
            // 移除行首行尾空白
            .replace(/^\s+|\s+$/gm, '')
            // 移除多余的换行
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            // 修复标点符号后的空格
            .replace(/([.!?])\s+/g, '$1 ')
            .trim();
    }

    /**
     * 从URL提取标题
     * @param {string} url - URL
     * @returns {string} 标题
     */
    extractTitleFromURL(url) {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const segments = pathname.split('/').filter(s => s);
            return segments.length > 0 ? segments[segments.length - 1] : urlObj.hostname;
        } catch (error) {
            return 'webpage-content';
        }
    }

    /**
     * 转换为Markdown格式
     * @param {Object} pageContent - 页面内容对象
     * @param {string} textContent - 提取的文本内容
     * @returns {string} Markdown格式内容
     */
    convertToMarkdown(pageContent, textContent) {
        try {
            // 如果有HTML内容，优先转换HTML
            if (pageContent.html) {
                const result = this.htmlToMarkdownConverter.convertDocument(pageContent.html);
                return result.markdown;
            }
            
            // 否则将纯文本转换为简单的Markdown
            return this.convertTextToMarkdown(textContent, pageContent.title);
            
        } catch (error) {
            console.error('Markdown转换失败:', error);
            // 转换失败时返回原始文本
            return textContent;
        }
    }

    /**
     * 将纯文本转换为简单的Markdown
     * @param {string} text - 文本内容
     * @param {string} title - 标题
     * @returns {string} Markdown内容
     */
    convertTextToMarkdown(text, title) {
        let markdown = '';
        
        // 添加标题
        if (title) {
            markdown += `# ${title}\n\n`;
        }
        
        // 将文本按段落分割
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        
        // 转换每个段落
        paragraphs.forEach(paragraph => {
            const trimmed = paragraph.trim();
            if (trimmed) {
                markdown += `${trimmed}\n\n`;
            }
        });
        
        return markdown.trim();
    }

    /**
     * 获取Markdown格式的文本内容
     * @returns {Object|null} Markdown内容对象
     */
    getMarkdownContent() {
        const textContent = this.getExtractedText();
        if (!textContent || !textContent.markdown) {
            return null;
        }
        
        return {
            title: textContent.title,
            markdown: textContent.markdown,
            originalContent: textContent.content,
            wordCount: textContent.wordCount,
            characterCount: textContent.characterCount,
            url: textContent.url,
            timestamp: textContent.timestamp
        };
    }

    /**
     * 开始网络监听
     */
    startNetworkMonitoring() {
        try {
            // 监听fetch请求
            this.interceptFetch();
            
            // 监听XMLHttpRequest
            this.interceptXHR();
            
            console.log('网络监听已启动');
        } catch (error) {
            console.error('网络监听启动失败:', error);
        }
    }

    /**
     * 拦截fetch请求
     */
    interceptFetch() {
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = function(...args) {
            const url = args[0];
            
            return originalFetch.apply(this, args).then(response => {
                // 记录响应信息
                if (response.ok) {
                    self.recordNetworkRequest(url, {
                        contentType: response.headers.get('content-type'),
                        contentLength: response.headers.get('content-length'),
                        status: response.status
                    });
                }
                return response;
            });
        };
    }

    /**
     * 拦截XMLHttpRequest
     */
    interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const self = this;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this.addEventListener('load', function() {
                if (this.status >= 200 && this.status < 300) {
                    self.recordNetworkRequest(url, {
                        contentType: this.getResponseHeader('content-type'),
                        contentLength: this.getResponseHeader('content-length'),
                        status: this.status
                    });
                }
            });
            
            return originalOpen.call(this, method, url, ...args);
        };
    }

    /**
     * 记录网络请求
     * @param {string} url - 请求URL
     * @param {Object} info - 请求信息
     */
    recordNetworkRequest(url, info) {
        try {
            // 只记录可能包含媒体或PDF的请求
            if (this.isRelevantRequest(url, info)) {
                this.networkRequests.set(url, {
                    ...info,
                    timestamp: Date.now()
                });
                
                // 限制记录数量
                if (this.networkRequests.size > 1000) {
                    const oldestKey = this.networkRequests.keys().next().value;
                    this.networkRequests.delete(oldestKey);
                }
            }
        } catch (error) {
            console.error('网络请求记录失败:', error);
        }
    }

    /**
     * 检查是否为相关请求
     * @param {string} url - URL
     * @param {Object} info - 请求信息
     * @returns {boolean} 是否相关
     */
    isRelevantRequest(url, info) {
        // 检查URL扩展名
        if (this.analyzeMediaURL(url) || this.isPDFURL(url)) {
            return true;
        }
        
        // 检查Content-Type
        if (info.contentType) {
            const contentType = info.contentType.toLowerCase();
            return contentType.includes('video/') ||
                   contentType.includes('audio/') ||
                   contentType.includes('image/') ||
                   contentType.includes('application/pdf');
        }
        
        return false;
    }

    /**
     * 获取检测到的媒体文件
     * @returns {Array} 媒体文件列表
     */
    getDetectedMedia() {
        return this.detectedContent.media || [];
    }

    /**
     * 获取提取的文本内容
     * @returns {Object|null} 文本内容
     */
    getExtractedText() {
        return this.detectedContent.text;
    }

    /**
     * 获取检测到的PDF文件
     * @returns {Array} PDF文件列表
     */
    getDetectedPDFs() {
        return this.detectedContent.pdfs || [];
    }

    /**
     * 获取所有检测到的内容统计
     * @returns {Object} 内容统计
     */
    getContentStats() {
        return {
            mediaCount: this.detectedContent.media.length,
            pdfCount: this.detectedContent.pdfs.length,
            hasText: this.detectedContent.text !== null,
            textLength: this.detectedContent.text ? this.detectedContent.text.content.length : 0,
            networkRequestCount: this.networkRequests.size
        };
    }

    /**
     * 清理检测结果
     */
    clearDetectedContent() {
        this.detectedContent = {
            media: [],
            text: null,
            pdfs: []
        };
        
        // 清理旧的网络请求记录
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分钟
        
        for (const [url, info] of this.networkRequests.entries()) {
            if (now - info.timestamp > maxAge) {
                this.networkRequests.delete(url);
            }
        }
    }

    /**
     * 注册内容检测回调
     * @param {Function} callback - 回调函数
     */
    onContentDetected(callback) {
        this.contentCallbacks.push(callback);
    }

    /**
     * 通知内容检测完成
     * @param {Object} detectedContent - 检测到的内容
     */
    notifyContentDetected(detectedContent) {
        this.contentCallbacks.forEach(callback => {
            try {
                callback(detectedContent);
            } catch (error) {
                console.error('内容检测回调错误:', error);
            }
        });
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
     * @param {Error} error - 错误对象
     */
    notifyError(message, error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(message, error);
            } catch (error) {
                console.error('错误回调执行失败:', error);
            }
        });
    }

    /**
     * 统计单词数
     * @param {string} text - 文本
     * @returns {number} 单词数
     */
    countWords(text) {
        if (!text) return 0;
        
        // 简单的单词计数（支持中英文）
        const words = text.match(/[\w\u4e00-\u9fff]+/g);
        return words ? words.length : 0;
    }

    /**
     * 转换为Markdown格式
     * @param {Object} pageContent - 页面内容对象
     * @param {string} textContent - 提取的文本内容
     * @returns {string} Markdown格式内容
     */
    convertToMarkdown(pageContent, textContent) {
        try {
            // 如果有HTML内容，优先转换HTML
            if (pageContent.html) {
                const result = this.htmlToMarkdownConverter.convertDocument(pageContent.html);
                return result.markdown;
            }
            
            // 否则将纯文本转换为简单的Markdown
            return this.convertTextToMarkdown(textContent, pageContent.title);
            
        } catch (error) {
            console.error('Markdown转换失败:', error);
            // 转换失败时返回原始文本
            return textContent;
        }
    }

    /**
     * 将纯文本转换为简单的Markdown
     * @param {string} text - 文本内容
     * @param {string} title - 标题
     * @returns {string} Markdown内容
     */
    convertTextToMarkdown(text, title) {
        let markdown = '';
        
        // 添加标题
        if (title) {
            markdown += `# ${title}\n\n`;
        }
        
        // 将文本按段落分割
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
        
        // 转换每个段落
        paragraphs.forEach(paragraph => {
            const trimmed = paragraph.trim();
            if (trimmed) {
                markdown += `${trimmed}\n\n`;
            }
        });
        
        return markdown.trim();
    }

    /**
     * 获取Markdown格式的文本内容
     * @returns {Object|null} Markdown内容对象
     */
    getMarkdownContent() {
        const textContent = this.getExtractedText();
        if (!textContent || !textContent.markdown) {
            return null;
        }
        
        return {
            title: textContent.title,
            markdown: textContent.markdown,
            originalContent: textContent.content,
            wordCount: textContent.wordCount,
            characterCount: textContent.characterCount,
            url: textContent.url,
            timestamp: textContent.timestamp
        };
    }

    /**
     * 清理资源
     */
    destroy() {
        this.networkRequests.clear();
        this.contentCallbacks = [];
        this.errorCallbacks = [];
        this.clearDetectedContent();
        
        if (this.htmlToMarkdownConverter) {
            this.htmlToMarkdownConverter.destroy();
        }
    }
}