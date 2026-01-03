/**
 * 下载管理器属性测试
 * 验证DownloadManager类的文件下载、进度跟踪和并发管理功能
 */

import { DownloadManager } from '../js/modules/DownloadManager.js';
import { MobileAdaptationManager } from '../js/modules/MobileAdaptationManager.js';

// 全局测试对象
window.downloadManagerTests = {
    async runTests() {
        const framework = window.TestFramework;
        const suite = framework.createSuite('DownloadManager 属性测试');

        // 测试数据生成器
        const testDataGenerators = {
            // 生成测试文件URL
            generateTestFiles() {
                return [
                    { url: 'https://example.com/video.mp4', filename: 'test-video.mp4', type: 'media' },
                    { url: 'https://example.com/audio.mp3', filename: 'test-audio.mp3', type: 'media' },
                    { url: 'https://example.com/document.pdf', filename: 'test-document.pdf', type: 'pdf' },
                    { url: 'https://example.com/image.jpg', filename: 'test-image.jpg', type: 'media' }
                ];
            },

            // 生成测试文本内容
            generateTestTexts() {
                return [
                    {
                        content: '这是一个测试文本内容。包含多个段落和有用的信息。',
                        filename: 'test-content',
                        options: { title: '测试文档', url: 'https://example.com/test' }
                    },
                    {
                        content: '# 标题\n\n这是Markdown格式的内容。\n\n## 子标题\n\n- 列表项1\n- 列表项2',
                        filename: 'markdown-content',
                        options: { title: 'Markdown文档' }
                    },
                    {
                        content: 'A'.repeat(10000), // 大文本
                        filename: 'large-content',
                        options: { title: '大文档' }
                    }
                ];
            }
        };

        // 创建模拟的MobileAdaptationManager
        function createMockMobileManager() {
            return {
                detectDeviceAndBrowser() {
                    return {
                        isIOS: false,
                        isAndroid: false,
                        isMobile: false,
                        browser: 'chrome'
                    };
                },
                async adaptDownloadForMobile(url, filename, deviceInfo, progressCallback) {
                    // 模拟下载进度
                    if (progressCallback) {
                        progressCallback(0, 100);
                        setTimeout(() => progressCallback(50, 100), 100);
                        setTimeout(() => progressCallback(100, 100), 200);
                    }
                    return Promise.resolve();
                }
            };
        }

        // 属性8: 下载文件管理
        suite.addTest('属性8: 下载任务创建和管理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            const testFiles = testDataGenerators.generateTestFiles();
            const downloadIds = [];

            // 创建多个下载任务
            for (const file of testFiles) {
                let downloadId;
                if (file.type === 'media') {
                    downloadId = await downloadManager.downloadMediaFile(file.url, file.filename);
                } else if (file.type === 'pdf') {
                    downloadId = await downloadManager.downloadPDFFile(file.url, file.filename);
                }
                
                downloadIds.push(downloadId);
                
                framework.assert(
                    downloadId && typeof downloadId === 'string',
                    '应该返回有效的下载ID'
                );
            }

            // 验证下载任务管理
            const allDownloads = downloadManager.getAllDownloads();
            framework.assert(
                allDownloads.length === testFiles.length,
                `应该创建 ${testFiles.length} 个下载任务，实际创建 ${allDownloads.length} 个`
            );

            // 验证每个下载任务的属性
            for (let i = 0; i < downloadIds.length; i++) {
                const progress = downloadManager.getDownloadProgress(downloadIds[i]);
                framework.assert(
                    progress !== null,
                    '应该能获取下载进度信息'
                );
                
                framework.assert(
                    progress.filename === testFiles[i].filename,
                    '文件名应该正确保存'
                );
                
                framework.assert(
                    progress.type === testFiles[i].type,
                    '文件类型应该正确保存'
                );
            }
        });

        suite.addTest('属性8: 文本下载处理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            const testTexts = testDataGenerators.generateTestTexts();
            const downloadIds = [];

            // 测试文本下载
            for (const textData of testTexts) {
                const downloadId = await downloadManager.downloadTextContent(
                    textData.content,
                    textData.filename,
                    textData.options
                );
                
                downloadIds.push(downloadId);
                
                framework.assert(
                    downloadId && typeof downloadId === 'string',
                    '文本下载应该返回有效的下载ID'
                );
                
                const progress = downloadManager.getDownloadProgress(downloadId);
                framework.assert(
                    progress.type === 'text',
                    '下载类型应该是text'
                );
                
                framework.assert(
                    progress.filename.endsWith('.md'),
                    '文本文件应该有.md扩展名'
                );
            }

            // 验证Markdown转换
            const markdownContent = downloadManager.convertToMarkdown(
                testTexts[0].content,
                testTexts[0].options
            );
            
            framework.assert(
                markdownContent.includes(testTexts[0].options.title),
                'Markdown应该包含标题'
            );
            
            framework.assert(
                markdownContent.includes(testTexts[0].content),
                'Markdown应该包含原始内容'
            );
            
            framework.assert(
                markdownContent.includes('Web浏览器下载器'),
                'Markdown应该包含工具标识'
            );
        });

        // 属性9: 并发下载管理
        suite.addTest('属性9: 并发下载限制', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            // 设置较小的并发限制用于测试
            downloadManager.maxConcurrentDownloads = 2;

            const testFiles = testDataGenerators.generateTestFiles();
            const downloadPromises = [];

            // 同时启动多个下载
            for (const file of testFiles) {
                const promise = downloadManager.downloadMediaFile(file.url, file.filename);
                downloadPromises.push(promise);
            }

            // 等待所有下载完成
            const downloadIds = await Promise.all(downloadPromises);

            // 验证下载统计
            const stats = downloadManager.getDownloadStats();
            framework.assert(
                stats.total === testFiles.length,
                `总下载数应该是 ${testFiles.length}，实际是 ${stats.total}`
            );

            // 验证并发控制
            framework.assert(
                stats.activeDownloads <= downloadManager.maxConcurrentDownloads,
                `活跃下载数不应超过 ${downloadManager.maxConcurrentDownloads}`
            );
        });

        suite.addTest('属性9: 下载队列管理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            // 设置并发限制为1，强制使用队列
            downloadManager.maxConcurrentDownloads = 1;

            const testFiles = testDataGenerators.generateTestFiles();
            const downloadIds = [];

            // 快速添加多个下载任务
            for (const file of testFiles) {
                const downloadId = await downloadManager.downloadMediaFile(file.url, file.filename);
                downloadIds.push(downloadId);
            }

            // 检查队列状态
            const stats = downloadManager.getDownloadStats();
            framework.assert(
                stats.total === testFiles.length,
                '所有下载任务都应该被创建'
            );

            // 验证状态分布
            const allDownloads = downloadManager.getAllDownloads();
            const statusCounts = {};
            allDownloads.forEach(download => {
                statusCounts[download.status] = (statusCounts[download.status] || 0) + 1;
            });

            framework.assert(
                statusCounts.downloading <= 1,
                '同时下载的任务不应超过1个'
            );
        });

        // 属性6: 下载进度显示
        suite.addTest('属性6: 进度跟踪准确性', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            let progressUpdates = [];
            
            // 注册进度回调
            downloadManager.onProgressUpdate((downloadId, progress) => {
                progressUpdates.push({ downloadId, progress });
            });

            const testFile = testDataGenerators.generateTestFiles()[0];
            const downloadId = await downloadManager.downloadMediaFile(testFile.url, testFile.filename);

            // 等待进度更新
            await new Promise(resolve => setTimeout(resolve, 300));

            // 验证进度更新
            framework.assert(
                progressUpdates.length > 0,
                '应该收到进度更新'
            );

            const relevantUpdates = progressUpdates.filter(update => update.downloadId === downloadId);
            framework.assert(
                relevantUpdates.length > 0,
                '应该收到相关下载的进度更新'
            );

            // 验证进度值的有效性
            for (const update of relevantUpdates) {
                framework.assert(
                    update.progress.progress >= 0 && update.progress.progress <= 100,
                    `进度值应该在0-100之间，实际是 ${update.progress.progress}`
                );
            }
        });

        suite.addTest('属性6: 下载状态管理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            const testFile = testDataGenerators.generateTestFiles()[0];
            const downloadId = await downloadManager.downloadMediaFile(testFile.url, testFile.filename);

            // 验证初始状态
            let progress = downloadManager.getDownloadProgress(downloadId);
            framework.assert(
                progress.status !== null,
                '下载应该有状态'
            );

            // 验证状态转换
            const validStatuses = ['pending', 'queued', 'downloading', 'completed', 'failed', 'cancelled', 'retrying'];
            framework.assert(
                validStatuses.includes(progress.status),
                `状态应该是有效值，实际是 ${progress.status}`
            );

            // 验证时间戳
            framework.assert(
                progress.startTime > 0,
                '应该记录开始时间'
            );

            framework.assert(
                progress.lastUpdate >= progress.startTime,
                '最后更新时间应该不早于开始时间'
            );
        });

        // 错误处理和重试测试
        suite.addTest('错误处理: 下载失败重试', async () => {
            const mobileManager = {
                detectDeviceAndBrowser() {
                    return { isIOS: false, isAndroid: false, isMobile: false };
                },
                async adaptDownloadForMobile() {
                    throw new Error('模拟下载失败');
                }
            };

            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            let errorNotifications = [];
            downloadManager.onError((downloadId, error) => {
                errorNotifications.push({ downloadId, error });
            });

            const testFile = testDataGenerators.generateTestFiles()[0];
            
            try {
                await downloadManager.downloadMediaFile(testFile.url, testFile.filename);
            } catch (error) {
                // 预期会失败
            }

            // 等待重试逻辑执行
            await new Promise(resolve => setTimeout(resolve, 100));

            // 验证错误处理
            framework.assert(
                errorNotifications.length > 0,
                '应该收到错误通知'
            );
        });

        suite.addTest('错误处理: 下载取消', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            const testFile = testDataGenerators.generateTestFiles()[0];
            const downloadId = await downloadManager.downloadMediaFile(testFile.url, testFile.filename);

            // 取消下载
            downloadManager.cancelDownload(downloadId);

            const progress = downloadManager.getDownloadProgress(downloadId);
            framework.assert(
                progress.status === 'cancelled',
                '下载状态应该是cancelled'
            );
        });

        // 性能和资源管理测试
        suite.addTest('性能测试: 大量下载任务', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            const startTime = performance.now();
            const downloadCount = 50;
            const downloadIds = [];

            // 创建大量下载任务
            for (let i = 0; i < downloadCount; i++) {
                const downloadId = await downloadManager.downloadTextContent(
                    `测试内容 ${i}`,
                    `test-${i}`
                );
                downloadIds.push(downloadId);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            framework.assert(
                duration < 5000, // 5秒内完成
                `创建 ${downloadCount} 个下载任务应该在5秒内完成，实际用时 ${duration.toFixed(2)}ms`
            );

            // 验证所有任务都被创建
            const stats = downloadManager.getDownloadStats();
            framework.assert(
                stats.total === downloadCount,
                `应该创建 ${downloadCount} 个任务，实际创建 ${stats.total} 个`
            );
        });

        suite.addTest('资源管理: 下载清理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            // 创建一些下载任务
            const testFiles = testDataGenerators.generateTestFiles();
            for (const file of testFiles) {
                await downloadManager.downloadMediaFile(file.url, file.filename);
            }

            const initialStats = downloadManager.getDownloadStats();
            framework.assert(
                initialStats.total > 0,
                '应该有下载任务'
            );

            // 清理下载
            downloadManager.cleanupDownloads();

            const finalStats = downloadManager.getDownloadStats();
            framework.assert(
                finalStats.activeDownloads === 0,
                '活跃下载应该被清理'
            );

            framework.assert(
                finalStats.queueLength === 0,
                '下载队列应该被清空'
            );
        });

        suite.addTest('文件扩展名处理', async () => {
            const mobileManager = createMockMobileManager();
            const downloadManager = new DownloadManager(mobileManager);
            await downloadManager.initialize();

            // 测试扩展名确保功能
            const testCases = [
                { filename: 'test', extension: '.md', expected: 'test.md' },
                { filename: 'test.md', extension: '.md', expected: 'test.md' },
                { filename: 'test.txt', extension: '.md', expected: 'test.txt.md' },
                { filename: 'test.MD', extension: '.md', expected: 'test.MD' }
            ];

            for (const testCase of testCases) {
                const result = downloadManager.ensureFileExtension(testCase.filename, testCase.extension);
                framework.assert(
                    result === testCase.expected,
                    `${testCase.filename} + ${testCase.extension} 应该是 ${testCase.expected}，实际是 ${result}`
                );
            }
        });

        return await suite.run();
    }
};

console.log('DownloadManager 属性测试模块已加载');