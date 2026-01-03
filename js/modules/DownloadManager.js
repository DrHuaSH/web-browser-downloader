/**
 * 下载管理器 - 处理文件下载和进度管理
 */
import { ErrorHandler } from './ErrorHandler.js';

export class DownloadManager {
    constructor(mobileManager) {
        this.mobileManager = mobileManager;
        this.errorHandler = new ErrorHandler();
        this.downloads = new Map(); // 存储下载任务
        this.progressCallbacks = [];
        this.errorCallbacks = [];
        this.completionCallbacks = [];
        this.isInitialized = false;
        this.maxConcurrentDownloads = 3; // 最大并发下载数
        this.activeDownloads = 0;
        this.downloadQueue = []; // 下载队列
        this.retryAttempts = 3; // 重试次数
        this.downloadTimeout = 30000; // 30秒超时
    }

    /**
     * 初始化下载管理器
     */
    async initialize() {
        this.isInitialized = true;
        this.setupDownloadHandlers();
        console.log('下载管理器初始化完成');
    }

    /**
     * 设置下载处理器
     */
    setupDownloadHandlers() {
        // 监听页面卸载，清理下载任务
        window.addEventListener('beforeunload', () => {
            this.cleanupDownloads();
        });

        // 定期清理完成的下载任务
        setInterval(() => {
            this.cleanupCompletedDownloads();
        }, 60000); // 每分钟清理一次
    }

    /**
     * 下载媒体文件
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Object} options - 下载选项
     * @returns {Promise<string>} 下载ID
     */
    async downloadMediaFile(url, filename, options = {}) {
        if (!this.isInitialized) {
            throw new Error('下载管理器未初始化');
        }

        const downloadId = this.generateDownloadId();
        const downloadTask = {
            id: downloadId,
            type: 'media',
            url: url,
            filename: filename,
            status: 'pending',
            progress: 0,
            startTime: Date.now(),
            retryCount: 0,
            options: options
        };

        this.downloads.set(downloadId, downloadTask);
        
        try {
            await this.queueDownload(downloadTask);
            return downloadId;
        } catch (error) {
            this.updateDownloadStatus(downloadId, 'failed', error.message);
            throw error;
        }
    }

    /**
     * 下载PDF文件
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Object} options - 下载选项
     * @returns {Promise<string>} 下载ID
     */
    async downloadPDFFile(url, filename, options = {}) {
        if (!this.isInitialized) {
            throw new Error('下载管理器未初始化');
        }

        const downloadId = this.generateDownloadId();
        const downloadTask = {
            id: downloadId,
            type: 'pdf',
            url: url,
            filename: filename,
            status: 'pending',
            progress: 0,
            startTime: Date.now(),
            retryCount: 0,
            options: options
        };

        this.downloads.set(downloadId, downloadTask);
        
        try {
            await this.queueDownload(downloadTask);
            return downloadId;
        } catch (error) {
            this.updateDownloadStatus(downloadId, 'failed', error.message);
            throw error;
        }
    }

    /**
     * 下载文本内容
     * @param {string} content - 文本内容
     * @param {string} filename - 文件名
     * @param {Object} options - 下载选项
     * @returns {Promise<string>} 下载ID
     */
    async downloadTextContent(content, filename, options = {}) {
        if (!this.isInitialized) {
            throw new Error('下载管理器未初始化');
        }

        const downloadId = this.generateDownloadId();
        const downloadTask = {
            id: downloadId,
            type: 'text',
            content: content,
            filename: filename,
            status: 'pending',
            progress: 0,
            startTime: Date.now(),
            retryCount: 0,
            options: options
        };

        this.downloads.set(downloadId, downloadTask);
        
        try {
            await this.executeTextDownload(downloadTask);
            return downloadId;
        } catch (error) {
            this.updateDownloadStatus(downloadId, 'failed', error.message);
            throw error;
        }
    }

    /**
     * 队列下载任务
     * @param {Object} downloadTask - 下载任务
     */
    async queueDownload(downloadTask) {
        if (this.activeDownloads < this.maxConcurrentDownloads) {
            await this.executeDownload(downloadTask);
        } else {
            this.downloadQueue.push(downloadTask);
            this.updateDownloadStatus(downloadTask.id, 'queued');
        }
    }

    /**
     * 执行下载任务
     * @param {Object} downloadTask - 下载任务
     */
    async executeDownload(downloadTask) {
        this.activeDownloads++;
        this.updateDownloadStatus(downloadTask.id, 'downloading');

        try {
            if (downloadTask.type === 'media' || downloadTask.type === 'pdf') {
                await this.executeFileDownload(downloadTask);
            } else if (downloadTask.type === 'text') {
                await this.executeTextDownload(downloadTask);
            }

            this.updateDownloadStatus(downloadTask.id, 'completed');
            this.notifyCompletion(downloadTask.id, downloadTask);

        } catch (error) {
            console.error(`下载失败 (${downloadTask.id}):`, error);
            
            // 重试逻辑
            if (downloadTask.retryCount < this.retryAttempts) {
                downloadTask.retryCount++;
                this.updateDownloadStatus(downloadTask.id, 'retrying');
                
                // 延迟重试
                setTimeout(() => {
                    this.executeDownload(downloadTask);
                }, 2000 * downloadTask.retryCount);
                
                return;
            }

            this.updateDownloadStatus(downloadTask.id, 'failed', error.message);
            this.notifyError(downloadTask.id, error);

        } finally {
            this.activeDownloads--;
            this.processQueue();
        }
    }

    /**
     * 执行文件下载
     * @param {Object} downloadTask - 下载任务
     */
    async executeFileDownload(downloadTask) {
        const operationId = `download-${downloadTask.id}`;
        
        const downloadFunction = async () => {
            const deviceInfo = this.mobileManager.detectDeviceAndBrowser();
            
            // 创建下载进度跟踪
            const progressTracker = (loaded, total) => {
                const progress = total > 0 ? Math.round((loaded / total) * 100) : 0;
                downloadTask.progress = progress;
                this.notifyProgressUpdate(downloadTask.id, {
                    progress: progress,
                    loaded: loaded,
                    total: total,
                    status: 'downloading'
                });
            };

            if (deviceInfo.isIOS || deviceInfo.isAndroid) {
                // 移动设备下载
                return await this.mobileManager.adaptDownloadForMobile(
                    downloadTask.url, 
                    downloadTask.filename, 
                    deviceInfo,
                    progressTracker
                );
            } else {
                // 桌面设备下载
                return await this.downloadFileWithProgress(
                    downloadTask.url, 
                    downloadTask.filename, 
                    progressTracker
                );
            }
        };

        try {
            return await this.errorHandler.handleNetworkError(
                new Error('Download preparation'),
                operationId,
                downloadFunction
            );
        } catch (error) {
            // 处理移动设备特殊错误
            const deviceInfo = this.mobileManager.detectDeviceAndBrowser();
            if (deviceInfo.isIOS || deviceInfo.isAndroid) {
                const mobileErrorMessage = this.errorHandler.handleMobileError(error, 'download');
                throw new Error(mobileErrorMessage);
            }
            
            throw error;
        }
    }

    /**
     * 带进度的文件下载
     * @param {string} url - 文件URL
     * @param {string} filename - 文件名
     * @param {Function} progressCallback - 进度回调
     */
    async downloadFileWithProgress(url, filename, progressCallback) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';
            
            // 设置超时
            xhr.timeout = this.downloadTimeout;
            
            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    progressCallback(event.loaded, event.total);
                }
            };
            
            xhr.onload = () => {
                if (xhr.status === 200) {
                    const blob = xhr.response;
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    resolve();
                } else {
                    reject(new Error(`下载失败: HTTP ${xhr.status}`));
                }
            };
            
            xhr.onerror = () => reject(new Error('网络错误'));
            xhr.ontimeout = () => reject(new Error('下载超时'));
            
            xhr.send();
        });
    }

    /**
     * 执行文本下载
     * @param {Object} downloadTask - 下载任务
     */
    async executeTextDownload(downloadTask) {
        this.updateDownloadStatus(downloadTask.id, 'processing');
        
        try {
            // 转换为Markdown格式
            const markdownContent = this.convertToMarkdown(downloadTask.content, downloadTask.options);
            
            // 创建Blob
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            
            // 确保文件名有正确的扩展名
            const finalFilename = this.ensureFileExtension(downloadTask.filename, '.md');
            
            // 检测设备并适配下载方法
            const deviceInfo = this.mobileManager.detectDeviceAndBrowser();
            
            if (deviceInfo.isIOS) {
                // iOS设备：在新标签页中显示内容
                this.showContentInNewTab(markdownContent, finalFilename);
            } else {
                // 其他设备：直接下载
                const a = document.createElement('a');
                a.href = url;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            
            URL.revokeObjectURL(url);
            
            // 更新进度到100%
            downloadTask.progress = 100;
            this.notifyProgressUpdate(downloadTask.id, {
                progress: 100,
                status: 'completed'
            });
            
        } catch (error) {
            throw new Error('文本处理失败: ' + error.message);
        }
    }

    /**
     * 在新标签页显示内容（用于iOS设备）
     * @param {string} content - 内容
     * @param {string} filename - 文件名
     */
    showContentInNewTab(content, filename) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(`
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${filename}</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            line-height: 1.6;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            padding: 30px;
                            border-radius: 8px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        pre { 
                            white-space: pre-wrap; 
                            font-family: 'SF Mono', Monaco, monospace;
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 6px;
                            overflow-x: auto;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            padding-bottom: 20px;
                            border-bottom: 1px solid #eee;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            padding-top: 20px;
                            border-top: 1px solid #eee;
                            color: #666;
                            font-size: 14px;
                        }
                        .share-btn {
                            background: #007AFF;
                            color: white;
                            border: none;
                            padding: 12px 24px;
                            border-radius: 6px;
                            font-size: 16px;
                            margin: 10px;
                            cursor: pointer;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>${filename}</h1>
                            <button class="share-btn" onclick="shareContent()">分享内容</button>
                        </div>
                        <pre>${content}</pre>
                        <div class="footer">
                            <p><em>在iOS设备上，请使用上方的分享按钮或浏览器的分享功能保存此内容</em></p>
                        </div>
                    </div>
                    <script>
                        function shareContent() {
                            if (navigator.share) {
                                navigator.share({
                                    title: '${filename}',
                                    text: \`${content.replace(/`/g, '\\`')}\`
                                });
                            } else {
                                // 复制到剪贴板
                                navigator.clipboard.writeText(\`${content.replace(/`/g, '\\`')}\`).then(() => {
                                    alert('内容已复制到剪贴板');
                                });
                            }
                        }
                    </script>
                </body>
                </html>
            `);
            newWindow.document.close();
        }
    }

    /**
     * 转换为Markdown格式
     * @param {string} content - 原始内容
     * @param {Object} options - 转换选项
     * @returns {string} Markdown格式内容
     */
    convertToMarkdown(content, options = {}) {
        const timestamp = new Date().toLocaleString('zh-CN');
        const title = options.title || '网页内容';
        const url = options.url || '';
        
        let markdown = `# ${title}\n\n`;
        
        if (url) {
            markdown += `**来源:** ${url}\n\n`;
        }
        
        markdown += `**提取时间:** ${timestamp}\n\n`;
        markdown += `---\n\n`;
        markdown += content;
        markdown += `\n\n---\n\n*由Web浏览器下载器提取和转换*`;
        
        return markdown;
    }

    /**
     * 确保文件扩展名
     * @param {string} filename - 文件名
     * @param {string} extension - 扩展名
     * @returns {string} 带扩展名的文件名
     */
    ensureFileExtension(filename, extension) {
        if (!filename.toLowerCase().endsWith(extension.toLowerCase())) {
            return filename + extension;
        }
        return filename;
    }

    /**
     * 处理下载队列
     */
    processQueue() {
        if (this.downloadQueue.length > 0 && this.activeDownloads < this.maxConcurrentDownloads) {
            const nextTask = this.downloadQueue.shift();
            this.executeDownload(nextTask);
        }
    }

    /**
     * 更新下载状态
     * @param {string} downloadId - 下载ID
     * @param {string} status - 状态
     * @param {string} error - 错误信息
     */
    updateDownloadStatus(downloadId, status, error = null) {
        const download = this.downloads.get(downloadId);
        if (download) {
            download.status = status;
            download.lastUpdate = Date.now();
            
            if (error) {
                download.error = error;
            }
            
            if (status === 'completed') {
                download.completedTime = Date.now();
                download.duration = download.completedTime - download.startTime;
            }
        }
    }

    /**
     * 获取下载进度
     * @param {string} downloadId - 下载ID
     * @returns {Object} 下载进度信息
     */
    getDownloadProgress(downloadId) {
        const download = this.downloads.get(downloadId);
        if (!download) {
            return null;
        }
        
        return {
            id: download.id,
            type: download.type,
            filename: download.filename,
            status: download.status,
            progress: download.progress,
            startTime: download.startTime,
            lastUpdate: download.lastUpdate,
            retryCount: download.retryCount,
            error: download.error || null,
            duration: download.duration || null
        };
    }

    /**
     * 获取所有下载任务
     * @returns {Array} 下载任务列表
     */
    getAllDownloads() {
        return Array.from(this.downloads.values()).map(download => ({
            id: download.id,
            type: download.type,
            filename: download.filename,
            status: download.status,
            progress: download.progress,
            startTime: download.startTime,
            lastUpdate: download.lastUpdate,
            retryCount: download.retryCount,
            error: download.error || null
        }));
    }

    /**
     * 取消下载
     * @param {string} downloadId - 下载ID
     */
    cancelDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download) {
            if (download.status === 'downloading' || download.status === 'queued') {
                this.updateDownloadStatus(downloadId, 'cancelled');
                
                // 从队列中移除
                const queueIndex = this.downloadQueue.findIndex(task => task.id === downloadId);
                if (queueIndex !== -1) {
                    this.downloadQueue.splice(queueIndex, 1);
                }
                
                console.log(`下载已取消: ${download.filename}`);
            }
        }
    }

    /**
     * 重试下载
     * @param {string} downloadId - 下载ID
     */
    async retryDownload(downloadId) {
        const download = this.downloads.get(downloadId);
        if (download && download.status === 'failed') {
            download.retryCount = 0;
            download.status = 'pending';
            download.progress = 0;
            download.error = null;
            
            await this.queueDownload(download);
        }
    }

    /**
     * 清理完成的下载任务
     */
    cleanupCompletedDownloads() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时
        
        for (const [id, download] of this.downloads.entries()) {
            if ((download.status === 'completed' || download.status === 'failed') &&
                (now - download.lastUpdate) > maxAge) {
                this.downloads.delete(id);
            }
        }
    }

    /**
     * 清理所有下载任务
     */
    cleanupDownloads() {
        // 取消所有进行中的下载
        for (const [id, download] of this.downloads.entries()) {
            if (download.status === 'downloading' || download.status === 'queued') {
                this.cancelDownload(id);
            }
        }
        
        this.downloadQueue = [];
        this.activeDownloads = 0;
    }

    /**
     * 获取下载统计
     * @returns {Object} 下载统计信息
     */
    getDownloadStats() {
        const downloads = Array.from(this.downloads.values());
        
        return {
            total: downloads.length,
            completed: downloads.filter(d => d.status === 'completed').length,
            failed: downloads.filter(d => d.status === 'failed').length,
            downloading: downloads.filter(d => d.status === 'downloading').length,
            queued: downloads.filter(d => d.status === 'queued').length,
            cancelled: downloads.filter(d => d.status === 'cancelled').length,
            activeDownloads: this.activeDownloads,
            queueLength: this.downloadQueue.length
        };
    }

    /**
     * 生成下载ID
     * @returns {string} 唯一的下载ID
     */
    generateDownloadId() {
        return 'download_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 注册进度更新回调
     * @param {Function} callback - 回调函数
     */
    onProgressUpdate(callback) {
        this.progressCallbacks.push(callback);
    }

    /**
     * 通知进度更新
     * @param {string} downloadId - 下载ID
     * @param {Object} progress - 进度信息
     */
    notifyProgressUpdate(downloadId, progress) {
        this.progressCallbacks.forEach(callback => {
            try {
                callback(downloadId, progress);
            } catch (error) {
                console.error('进度更新回调错误:', error);
            }
        });
    }

    /**
     * 注册完成回调
     * @param {Function} callback - 回调函数
     */
    onCompletion(callback) {
        this.completionCallbacks.push(callback);
    }

    /**
     * 通知下载完成
     * @param {string} downloadId - 下载ID
     * @param {Object} downloadTask - 下载任务
     */
    notifyCompletion(downloadId, downloadTask) {
        this.completionCallbacks.forEach(callback => {
            try {
                callback(downloadId, downloadTask);
            } catch (error) {
                console.error('完成回调错误:', error);
            }
        });
    }

    /**
     * 注册错误回调
     * @param {Function} callback - 错误处理回调函数
     */
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    /**
     * 通知错误
     * @param {string} downloadId - 下载ID
     * @param {Error} error - 错误对象
     */
    notifyError(downloadId, error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(downloadId, error);
            } catch (callbackError) {
                console.error('错误回调执行失败:', callbackError);
            }
        });
    }

    /**
     * 清理资源
     */
    destroy() {
        this.cleanupDownloads();
        this.downloads.clear();
        this.progressCallbacks = [];
        this.errorCallbacks = [];
        this.completionCallbacks = [];
    }
}