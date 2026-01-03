/**
 * 内容检测器属性测试
 * 验证ContentDetector类的媒体检测、PDF检测、文本提取和HTML转换功能
 */

import { ContentDetector } from '../js/modules/ContentDetector.js';

// 全局测试对象
window.contentDetectorTests = {
    async runTests() {
        const framework = window.TestFramework;
        const suite = framework.createSuite('ContentDetector 属性测试');

        // 测试数据生成器
        const testDataGenerators = {
            // 生成媒体URL测试数据
            generateMediaURLs() {
                return [
                    { url: 'https://example.com/video.mp4', type: 'video', extension: 'mp4' },
                    { url: 'https://example.com/audio.mp3', type: 'audio', extension: 'mp3' },
                    { url: 'https://example.com/image.jpg', type: 'image', extension: 'jpg' },
                    { url: 'https://example.com/movie.avi', type: 'video', extension: 'avi' },
                    { url: 'https://example.com/song.wav', type: 'audio', extension: 'wav' },
                    { url: 'https://example.com/photo.png', type: 'image', extension: 'png' },
                    { url: 'https://example.com/clip.webm', type: 'video', extension: 'webm' },
                    { url: 'https://example.com/track.flac', type: 'audio', extension: 'flac' },
                    { url: 'https://example.com/graphic.svg', type: 'image', extension: 'svg' }
                ];
            },

            // 生成PDF URL测试数据
            generatePDFURLs() {
                return [
                    'https://example.com/document.pdf',
                    'https://example.com/report.PDF',
                    'https://example.com/manual.pdf?version=1',
                    'https://example.com/guide.pdf#page=1',
                    'https://example.com/download?file=doc.pdf&type=pdf'
                ];
            },

            // 生成页面内容测试数据
            generatePageContent() {
                return {
                    basic: {
                        title: '测试页面',
                        text: '这是一个测试页面的内容。包含多个段落和有用的信息。这里有足够的文本内容来进行提取测试。',
                        html: '<html><head><title>测试页面</title></head><body><h1>标题</h1><p>这是一个测试页面的内容。</p><p>包含多个段落和有用的信息。</p></body></html>',
                        links: [
                            { url: 'https://example.com/video.mp4', text: '视频文件' },
                            { url: 'https://example.com/document.pdf', text: 'PDF文档' },
                            { url: 'https://example.com/page.html', text: '普通链接' }
                        ],
                        images: [
                            { url: 'https://example.com/photo.jpg', alt: '照片', title: '测试照片' },
                            { url: 'https://example.com/icon.png', alt: '图标' }
                        ],
                        videos: [
                            { url: 'https://example.com/movie.mp4', title: '电影' }
                        ],
                        audios: [
                            { url: 'https://example.com/music.mp3', title: '音乐' }
                        ]
                    },
                    empty: {
                        title: '',
                        text: '',
                        html: '',
                        links: [],
                        images: [],
                        videos: [],
                        audios: []
                    },
                    complex: {
                        title: '复杂页面测试',
                        text: '这是一个包含大量内容的复杂页面。' + '内容重复。'.repeat(100),
                        html: '<html><body>' + '<p>段落内容</p>'.repeat(50) + '</body></html>',
                        links: Array.from({ length: 20 }, (_, i) => ({
                            url: `https://example.com/file${i}.mp4`,
                            text: `文件${i}`
                        })),
                        images: Array.from({ length: 15 }, (_, i) => ({
                            url: `https://example.com/image${i}.jpg`,
                            alt: `图片${i}`
                        }))
                    }
                };
            }
        };

        // 属性2: 媒体文件处理流程
        suite.addTest('属性2: 媒体文件检测一致性', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const mediaURLs = testDataGenerators.generateMediaURLs();
            
            // 测试每个媒体URL的检测
            for (const mediaData of mediaURLs) {
                const mediaInfo = detector.analyzeMediaURL(mediaData.url);
                
                framework.assert(
                    mediaInfo !== null,
                    `应该检测到媒体文件: ${mediaData.url}`
                );
                
                framework.assert(
                    mediaInfo.type === mediaData.type,
                    `媒体类型应该是 ${mediaData.type}, 实际是 ${mediaInfo.type}`
                );
                
                framework.assert(
                    mediaInfo.extension === mediaData.extension,
                    `文件扩展名应该是 ${mediaData.extension}, 实际是 ${mediaInfo.extension}`
                );
                
                framework.assert(
                    mediaInfo.url === mediaData.url,
                    `URL应该保持一致`
                );
            }
        });

        suite.addTest('属性2: 媒体文件去重和排序', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pageContent = {
                links: [
                    { url: 'https://example.com/video.mp4', text: '视频1' },
                    { url: 'https://example.com/video.mp4', text: '视频1重复' }, // 重复URL
                    { url: 'https://example.com/audio.mp3', text: '音频1' },
                    { url: 'https://example.com/image.jpg', text: '图片1' }
                ],
                images: [
                    { url: 'https://example.com/photo.png', alt: '照片' }
                ],
                videos: [],
                audios: []
            };

            const mediaFiles = detector.detectMediaFiles(pageContent);
            
            // 验证去重
            const urls = mediaFiles.map(file => file.originalUrl);
            const uniqueUrls = [...new Set(urls)];
            framework.assert(
                urls.length === uniqueUrls.length,
                '媒体文件应该去重'
            );
            
            // 验证排序（video > audio > image）
            const types = mediaFiles.map(file => file.type);
            let lastTypeOrder = -1;
            const typeOrder = { video: 0, audio: 1, image: 2, unknown: 3 };
            
            for (const type of types) {
                const currentOrder = typeOrder[type] || 3;
                framework.assert(
                    currentOrder >= lastTypeOrder,
                    `媒体文件应该按类型排序: ${types.join(', ')}`
                );
                lastTypeOrder = currentOrder;
            }
        });

        suite.addTest('属性2: 网络请求媒体检测', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            // 模拟网络请求记录
            detector.recordNetworkRequest('https://example.com/stream.mp4', {
                contentType: 'video/mp4',
                contentLength: '1024000',
                status: 200
            });

            detector.recordNetworkRequest('https://example.com/music.mp3', {
                contentType: 'audio/mpeg',
                contentLength: '512000',
                status: 200
            });

            const pageContent = { links: [], images: [], videos: [], audios: [] };
            const mediaFiles = detector.detectMediaFiles(pageContent);
            
            // 验证网络请求中的媒体文件被检测到
            const networkMedia = mediaFiles.filter(file => file.source === 'network');
            framework.assert(
                networkMedia.length >= 2,
                `应该检测到网络请求中的媒体文件，实际检测到 ${networkMedia.length} 个`
            );
            
            // 验证内容类型信息
            const videoFile = networkMedia.find(file => file.type === 'video');
            if (videoFile) {
                framework.assert(
                    videoFile.contentType === 'video/mp4',
                    '应该保留Content-Type信息'
                );
            }
        });

        // 属性3: PDF文件处理流程
        suite.addTest('属性3: PDF文件检测准确性', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pdfURLs = testDataGenerators.generatePDFURLs();
            
            // 测试PDF URL检测
            for (const url of pdfURLs) {
                const isPDF = detector.isPDFURL(url);
                framework.assert(
                    isPDF === true,
                    `应该识别为PDF文件: ${url}`
                );
            }
            
            // 测试非PDF URL
            const nonPDFURLs = [
                'https://example.com/page.html',
                'https://example.com/image.jpg',
                'https://example.com/video.mp4'
            ];
            
            for (const url of nonPDFURLs) {
                const isPDF = detector.isPDFURL(url);
                framework.assert(
                    isPDF === false,
                    `不应该识别为PDF文件: ${url}`
                );
            }
        });

        suite.addTest('属性3: PDF文件提取和去重', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pageContent = {
                links: [
                    { url: 'https://example.com/doc1.pdf', text: '文档1' },
                    { url: 'https://example.com/doc1.pdf', text: '文档1重复' }, // 重复
                    { url: 'https://example.com/doc2.pdf', text: '文档2' }
                ]
            };

            // 添加网络请求中的PDF
            detector.recordNetworkRequest('https://example.com/report.pdf', {
                contentType: 'application/pdf',
                contentLength: '2048000',
                status: 200
            });

            const pdfFiles = detector.detectPDFFiles(pageContent);
            
            // 验证去重
            const urls = pdfFiles.map(file => file.url);
            const uniqueUrls = [...new Set(urls)];
            framework.assert(
                urls.length === uniqueUrls.length,
                'PDF文件应该去重'
            );
            
            // 验证文件名提取
            for (const pdfFile of pdfFiles) {
                framework.assert(
                    pdfFile.filename && pdfFile.filename.length > 0,
                    '应该提取文件名'
                );
                
                framework.assert(
                    pdfFile.type === 'pdf',
                    '类型应该是pdf'
                );
            }
        });

        // 属性4: 文本内容处理流程
        suite.addTest('属性4: 文本内容提取完整性', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pageData = testDataGenerators.generatePageContent();
            
            // 测试基本文本提取
            const basicText = detector.extractTextContent(pageData.basic, 'https://example.com/test');
            framework.assert(
                basicText !== null,
                '应该提取到文本内容'
            );
            
            framework.assert(
                basicText.content.length > 0,
                '提取的文本应该有内容'
            );
            
            framework.assert(
                basicText.wordCount > 0,
                '应该统计单词数'
            );
            
            framework.assert(
                basicText.characterCount === basicText.content.length,
                '字符数应该正确'
            );
            
            // 测试空内容
            const emptyText = detector.extractTextContent(pageData.empty, 'https://example.com/empty');
            framework.assert(
                emptyText === null,
                '空内容应该返回null'
            );
        });

        suite.addTest('属性4: HTML文本提取和清理', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const htmlContent = `
                <html>
                    <head>
                        <title>测试页面</title>
                        <script>console.log('script');</script>
                        <style>body { color: red; }</style>
                    </head>
                    <body>
                        <h1>主标题</h1>
                        <p>这是第一段内容。</p>
                        <p>这是第二段内容。</p>
                        <script>alert('another script');</script>
                    </body>
                </html>
            `;

            const extractedText = detector.extractTextFromHTML(htmlContent);
            
            framework.assert(
                extractedText.includes('主标题'),
                '应该提取到标题文本'
            );
            
            framework.assert(
                extractedText.includes('第一段内容'),
                '应该提取到段落文本'
            );
            
            framework.assert(
                !extractedText.includes('console.log'),
                '不应该包含脚本内容'
            );
            
            framework.assert(
                !extractedText.includes('color: red'),
                '不应该包含样式内容'
            );
        });

        suite.addTest('属性4: 文本清理和格式化', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const messyText = `
                这是一个    包含多余空格的文本。
                
                
                
                还有多余的换行。
                
                标点符号后面的空格也需要处理。   这里有问题。
            `;

            const cleanedText = detector.cleanAndFormatText(messyText);
            
            framework.assert(
                !cleanedText.includes('    '),
                '不应该包含多余的空格'
            );
            
            framework.assert(
                !cleanedText.includes('\n\n\n'),
                '不应该包含多余的换行'
            );
            
            framework.assert(
                cleanedText.trim() === cleanedText,
                '文本应该去除首尾空白'
            );
        });

        suite.addTest('属性4: 单词统计准确性', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const testTexts = [
                { text: 'Hello world test', expectedWords: 3 },
                { text: '你好 世界 测试', expectedWords: 3 },
                { text: 'Mixed 中英文 content 内容', expectedWords: 4 },
                { text: '', expectedWords: 0 },
                { text: '   ', expectedWords: 0 }
            ];

            for (const testCase of testTexts) {
                const wordCount = detector.countWords(testCase.text);
                framework.assert(
                    wordCount === testCase.expectedWords,
                    `"${testCase.text}" 应该有 ${testCase.expectedWords} 个单词，实际 ${wordCount} 个`
                );
            }
        });

        // 综合测试
        suite.addTest('综合测试: 完整内容分析流程', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pageContent = testDataGenerators.generatePageContent().basic;
            const url = 'https://example.com/test-page';

            // 设置内容检测回调
            let detectedContent = null;
            detector.onContentDetected((content) => {
                detectedContent = content;
            });

            // 执行内容分析
            detector.analyzeContent(pageContent, url);

            // 等待异步处理完成
            await new Promise(resolve => setTimeout(resolve, 100));

            // 验证检测结果
            framework.assert(
                detectedContent !== null,
                '应该触发内容检测回调'
            );

            framework.assert(
                detectedContent.hasMedia === true,
                '应该检测到媒体文件'
            );

            framework.assert(
                detectedContent.hasText === true,
                '应该检测到文本内容'
            );

            framework.assert(
                detectedContent.hasPDF === true,
                '应该检测到PDF文件'
            );

            // 验证统计信息
            framework.assert(
                detectedContent.mediaCount > 0,
                '媒体文件数量应该大于0'
            );

            framework.assert(
                detectedContent.pdfCount > 0,
                'PDF文件数量应该大于0'
            );

            framework.assert(
                detectedContent.textLength > 0,
                '文本长度应该大于0'
            );
        });

        suite.addTest('性能测试: 大量内容处理', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            const pageContent = testDataGenerators.generatePageContent().complex;
            const url = 'https://example.com/complex-page';

            const startTime = performance.now();
            detector.analyzeContent(pageContent, url);
            const endTime = performance.now();

            const processingTime = endTime - startTime;
            
            framework.assert(
                processingTime < 1000, // 1秒内完成
                `大量内容处理应该在1秒内完成，实际用时 ${processingTime.toFixed(2)}ms`
            );

            // 验证结果正确性
            const mediaFiles = detector.getDetectedMedia();
            const stats = detector.getContentStats();

            framework.assert(
                mediaFiles.length > 0,
                '应该检测到媒体文件'
            );

            framework.assert(
                stats.mediaCount === mediaFiles.length,
                '统计信息应该一致'
            );
        });

        suite.addTest('错误处理: 无效输入处理', async () => {
            const detector = new ContentDetector();
            await detector.initialize();

            // 测试无效URL
            const invalidMediaInfo = detector.analyzeMediaURL('invalid-url');
            framework.assert(
                invalidMediaInfo === null,
                '无效URL应该返回null'
            );

            // 测试空内容
            detector.analyzeContent(null, 'https://example.com');
            detector.analyzeContent(undefined, 'https://example.com');
            
            // 应该不抛出异常
            framework.assert(true, '处理无效输入不应该抛出异常');

            // 测试错误回调
            let errorCaught = false;
            detector.onError((message, error) => {
                errorCaught = true;
            });

            // 触发一个可能的错误场景
            try {
                detector.extractTextFromHTML('<invalid>html');
            } catch (error) {
                // 忽略，测试错误处理
            }
        });

        return await suite.run();
    }
};

console.log('ContentDetector 属性测试模块已加载');