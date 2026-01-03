/**
 * 按钮状态管理属性测试
 * 验证UIController的按钮状态管理和用户界面交互功能
 */

import { UIController } from '../js/modules/UIController.js';

// 全局测试对象
window.buttonStateTests = {
    async runTests() {
        const framework = window.TestFramework;
        const suite = framework.createSuite('按钮状态管理 属性测试');

        // 测试数据生成器
        const testDataGenerators = {
            // 生成内容检测结果
            generateContentDetectionResults() {
                return [
                    // 无内容
                    {
                        hasMedia: false,
                        hasText: false,
                        hasPDF: false,
                        mediaCount: 0,
                        textLength: 0,
                        pdfCount: 0
                    },
                    // 只有媒体
                    {
                        hasMedia: true,
                        hasText: false,
                        hasPDF: false,
                        mediaCount: 3,
                        textLength: 0,
                        pdfCount: 0
                    },
                    // 只有文本
                    {
                        hasMedia: false,
                        hasText: true,
                        hasPDF: false,
                        mediaCount: 0,
                        textLength: 1500,
                        pdfCount: 0
                    },
                    // 只有PDF
                    {
                        hasMedia: false,
                        hasText: false,
                        hasPDF: true,
                        mediaCount: 0,
                        textLength: 0,
                        pdfCount: 2
                    },
                    // 全部内容
                    {
                        hasMedia: true,
                        hasText: true,
                        hasPDF: true,
                        mediaCount: 5,
                        textLength: 3000,
                        pdfCount: 1
                    },
                    // 大量内容
                    {
                        hasMedia: true,
                        hasText: true,
                        hasPDF: true,
                        mediaCount: 15,
                        textLength: 50000,
                        pdfCount: 8
                    }
                ];
            }
        };

        // 创建模拟DOM环境
        function createMockDOM() {
            // 创建必要的DOM元素
            const mockElements = {
                app: document.createElement('div'),
                toolbar: document.createElement('header'),
                mediaBtn: document.createElement('button'),
                textBtn: document.createElement('button'),
                pdfBtn: document.createElement('button'),
                statusText: document.createElement('span'),
                loadingOverlay: document.createElement('div'),
                downloadPanel: document.createElement('div'),
                downloadList: document.createElement('div'),
                errorToast: document.createElement('div'),
                errorMessage: document.createElement('span'),
                urlInput: document.createElement('input'),
                browserIframe: document.createElement('iframe'),
                addressBar: document.createElement('div'),
                browserContainer: document.createElement('main'),
                goBtn: document.createElement('button'),
                refreshBtn: document.createElement('button'),
                closePanelBtn: document.createElement('button'),
                closeToastBtn: document.createElement('button')
            };

            // 设置ID和类名
            mockElements.app.id = 'app';
            mockElements.toolbar.className = 'toolbar';
            mockElements.mediaBtn.id = 'media-download-btn';
            mockElements.textBtn.id = 'text-download-btn';
            mockElements.pdfBtn.id = 'pdf-download-btn';
            mockElements.statusText.id = 'status-text';
            mockElements.loadingOverlay.id = 'loading-overlay';
            mockElements.downloadPanel.id = 'download-panel';
            mockElements.downloadList.id = 'download-list';
            mockElements.errorToast.id = 'error-toast';
            mockElements.errorMessage.id = 'error-message';
            mockElements.urlInput.id = 'url-input';
            mockElements.browserIframe.id = 'browser-iframe';
            mockElements.addressBar.className = 'address-bar';
            mockElements.browserContainer.className = 'browser-container';
            mockElements.goBtn.id = 'go-btn';
            mockElements.refreshBtn.id = 'refresh-btn';
            mockElements.closePanelBtn.id = 'close-panel-btn';
            mockElements.closeToastBtn.id = 'close-toast-btn';

            // 添加按钮文本
            mockElements.mediaBtn.textContent = '音视频下载';
            mockElements.textBtn.textContent = '文本下载';
            mockElements.pdfBtn.textContent = 'PDF下载';

            // 构建DOM结构
            mockElements.toolbar.appendChild(mockElements.mediaBtn);
            mockElements.toolbar.appendChild(mockElements.textBtn);
            mockElements.toolbar.appendChild(mockElements.pdfBtn);
            mockElements.toolbar.appendChild(mockElements.statusText);
            
            mockElements.app.appendChild(mockElements.toolbar);
            mockElements.app.appendChild(mockElements.browserContainer);
            mockElements.app.appendChild(mockElements.loadingOverlay);
            mockElements.app.appendChild(mockElements.downloadPanel);
            mockElements.app.appendChild(mockElements.errorToast);

            // 添加到文档
            document.body.appendChild(mockElements.app);

            return mockElements;
        }

        // 清理DOM
        function cleanupDOM(elements) {
            if (elements.app && elements.app.parentNode) {
                elements.app.parentNode.removeChild(elements.app);
            }
        }

        // 属性5: 按钮状态管理
        suite.addTest('属性5: 按钮状态一致性', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                const testResults = testDataGenerators.generateContentDetectionResults();

                // 测试每种内容检测结果
                for (const detectedContent of testResults) {
                    uiController.updateButtonStates(detectedContent);

                    // 验证媒体按钮状态
                    framework.assert(
                        mockElements.mediaBtn.disabled === !detectedContent.hasMedia,
                        `媒体按钮状态应该与hasMedia一致: ${detectedContent.hasMedia}`
                    );

                    // 验证文本按钮状态
                    framework.assert(
                        mockElements.textBtn.disabled === !detectedContent.hasText,
                        `文本按钮状态应该与hasText一致: ${detectedContent.hasText}`
                    );

                    // 验证PDF按钮状态
                    framework.assert(
                        mockElements.pdfBtn.disabled === !detectedContent.hasPDF,
                        `PDF按钮状态应该与hasPDF一致: ${detectedContent.hasPDF}`
                    );

                    // 验证按钮类名
                    if (detectedContent.hasMedia) {
                        framework.assert(
                            mockElements.mediaBtn.classList.contains('active'),
                            '有媒体内容时，媒体按钮应该有active类'
                        );
                    } else {
                        framework.assert(
                            !mockElements.mediaBtn.classList.contains('active'),
                            '无媒体内容时，媒体按钮不应该有active类'
                        );
                    }
                }
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('属性5: 徽章显示准确性', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                const testCases = [
                    {
                        content: { hasMedia: true, mediaCount: 5, hasText: false, hasPDF: false, textLength: 0, pdfCount: 0 },
                        expectedBadge: '5'
                    },
                    {
                        content: { hasMedia: false, mediaCount: 0, hasText: true, hasPDF: false, textLength: 1024, pdfCount: 0 },
                        expectedBadge: '1KB'
                    },
                    {
                        content: { hasMedia: false, mediaCount: 0, hasText: false, hasPDF: true, textLength: 0, pdfCount: 3 },
                        expectedBadge: '3'
                    }
                ];

                for (const testCase of testCases) {
                    uiController.updateButtonStates(testCase.content);

                    // 等待DOM更新
                    await new Promise(resolve => setTimeout(resolve, 50));

                    // 检查相应按钮的徽章
                    if (testCase.content.hasMedia) {
                        const badge = mockElements.mediaBtn.querySelector('.btn-badge');
                        framework.assert(
                            badge && badge.textContent === testCase.expectedBadge,
                            `媒体按钮徽章应该显示 ${testCase.expectedBadge}，实际显示 ${badge ? badge.textContent : '无'}`
                        );
                    }

                    if (testCase.content.hasText) {
                        const badge = mockElements.textBtn.querySelector('.btn-badge');
                        framework.assert(
                            badge && badge.textContent === testCase.expectedBadge,
                            `文本按钮徽章应该显示 ${testCase.expectedBadge}，实际显示 ${badge ? badge.textContent : '无'}`
                        );
                    }

                    if (testCase.content.hasPDF) {
                        const badge = mockElements.pdfBtn.querySelector('.btn-badge');
                        framework.assert(
                            badge && badge.textContent === testCase.expectedBadge,
                            `PDF按钮徽章应该显示 ${testCase.expectedBadge}，实际显示 ${badge ? badge.textContent : '无'}`
                        );
                    }
                }
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('属性5: 工具提示准确性', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                const testContent = {
                    hasMedia: true,
                    hasText: true,
                    hasPDF: true,
                    mediaCount: 3,
                    textLength: 2048,
                    pdfCount: 1
                };

                uiController.updateButtonStates(testContent);

                // 验证工具提示
                framework.assert(
                    mockElements.mediaBtn.title.includes('3'),
                    '媒体按钮工具提示应该包含数量信息'
                );

                framework.assert(
                    mockElements.textBtn.title.includes('2KB'),
                    '文本按钮工具提示应该包含大小信息'
                );

                framework.assert(
                    mockElements.pdfBtn.title.includes('1'),
                    'PDF按钮工具提示应该包含数量信息'
                );

                // 测试无内容时的工具提示
                const emptyContent = {
                    hasMedia: false,
                    hasText: false,
                    hasPDF: false,
                    mediaCount: 0,
                    textLength: 0,
                    pdfCount: 0
                };

                uiController.updateButtonStates(emptyContent);

                framework.assert(
                    mockElements.mediaBtn.title.includes('未发现'),
                    '无内容时，按钮工具提示应该显示未发现信息'
                );
            } finally {
                cleanupDOM(mockElements);
            }
        });

        // 属性12: 用户界面交互响应
        suite.addTest('属性12: 状态更新响应性', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                const startTime = performance.now();
                
                // 快速连续更新状态
                const testResults = testDataGenerators.generateContentDetectionResults();
                for (const content of testResults) {
                    uiController.updateButtonStates(content);
                }
                
                const endTime = performance.now();
                const duration = endTime - startTime;

                framework.assert(
                    duration < 100, // 100ms内完成
                    `状态更新应该在100ms内完成，实际用时 ${duration.toFixed(2)}ms`
                );

                // 验证最终状态正确
                const finalContent = testResults[testResults.length - 1];
                framework.assert(
                    mockElements.mediaBtn.disabled === !finalContent.hasMedia,
                    '快速更新后，最终状态应该正确'
                );
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('属性12: 视觉反馈一致性', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                // 测试不同内容数量的视觉反馈
                const testCases = [
                    { mediaCount: 1, expectedClass: 'low-content' },
                    { mediaCount: 5, expectedClass: 'medium-content' },
                    { mediaCount: 15, expectedClass: 'high-content' }
                ];

                for (const testCase of testCases) {
                    const content = {
                        hasMedia: true,
                        hasText: false,
                        hasPDF: false,
                        mediaCount: testCase.mediaCount,
                        textLength: 0,
                        pdfCount: 0
                    };

                    uiController.updateButtonStates(content);

                    framework.assert(
                        mockElements.mediaBtn.classList.contains(testCase.expectedClass),
                        `媒体数量为 ${testCase.mediaCount} 时，应该有 ${testCase.expectedClass} 类`
                    );
                }
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('属性12: 工具栏状态指示器', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                // 测试有内容时的工具栏状态
                const contentWithItems = {
                    hasMedia: true,
                    hasText: false,
                    hasPDF: false,
                    mediaCount: 3,
                    textLength: 0,
                    pdfCount: 0
                };

                uiController.updateButtonStates(contentWithItems);

                framework.assert(
                    mockElements.toolbar.classList.contains('has-content'),
                    '有内容时，工具栏应该有has-content类'
                );

                framework.assert(
                    !mockElements.toolbar.classList.contains('no-content'),
                    '有内容时，工具栏不应该有no-content类'
                );

                // 测试无内容时的工具栏状态
                const emptyContent = {
                    hasMedia: false,
                    hasText: false,
                    hasPDF: false,
                    mediaCount: 0,
                    textLength: 0,
                    pdfCount: 0
                };

                uiController.updateButtonStates(emptyContent);

                framework.assert(
                    mockElements.toolbar.classList.contains('no-content'),
                    '无内容时，工具栏应该有no-content类'
                );

                framework.assert(
                    !mockElements.toolbar.classList.contains('has-content'),
                    '无内容时，工具栏不应该有has-content类'
                );
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('边界条件: 极值处理', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                // 测试极大值
                const extremeContent = {
                    hasMedia: true,
                    hasText: true,
                    hasPDF: true,
                    mediaCount: 999,
                    textLength: 1024 * 1024 * 10, // 10MB
                    pdfCount: 100
                };

                uiController.updateButtonStates(extremeContent);

                // 验证不会出现错误
                framework.assert(
                    !mockElements.mediaBtn.disabled,
                    '极大值情况下，按钮状态应该正确'
                );

                const mediaBadge = mockElements.mediaBtn.querySelector('.btn-badge');
                framework.assert(
                    mediaBadge && mediaBadge.textContent === '999',
                    '极大值应该正确显示在徽章中'
                );

                // 测试零值
                const zeroContent = {
                    hasMedia: false,
                    hasText: false,
                    hasPDF: false,
                    mediaCount: 0,
                    textLength: 0,
                    pdfCount: 0
                };

                uiController.updateButtonStates(zeroContent);

                framework.assert(
                    mockElements.mediaBtn.disabled,
                    '零值情况下，按钮应该被禁用'
                );
            } finally {
                cleanupDOM(mockElements);
            }
        });

        suite.addTest('错误处理: 无效输入', async () => {
            const mockElements = createMockDOM();
            
            try {
                const uiController = new UIController();
                await uiController.initialize();

                // 测试null输入
                try {
                    uiController.updateButtonStates(null);
                    framework.assert(true, '应该能处理null输入');
                } catch (error) {
                    framework.assert(false, `不应该因null输入而抛出错误: ${error.message}`);
                }

                // 测试undefined输入
                try {
                    uiController.updateButtonStates(undefined);
                    framework.assert(true, '应该能处理undefined输入');
                } catch (error) {
                    framework.assert(false, `不应该因undefined输入而抛出错误: ${error.message}`);
                }

                // 测试不完整的输入
                try {
                    uiController.updateButtonStates({ hasMedia: true }); // 缺少其他字段
                    framework.assert(true, '应该能处理不完整的输入');
                } catch (error) {
                    framework.assert(false, `不应该因不完整输入而抛出错误: ${error.message}`);
                }
            } finally {
                cleanupDOM(mockElements);
            }
        });

        return await suite.run();
    }
};

console.log('按钮状态管理 属性测试模块已加载');