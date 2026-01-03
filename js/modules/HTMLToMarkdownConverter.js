/**
 * HTML到Markdown转换器
 * 将HTML内容转换为Markdown格式，保留文本结构
 */
export class HTMLToMarkdownConverter {
    constructor() {
        this.isInitialized = false;
        this.conversionRules = this.setupConversionRules();
    }

    /**
     * 初始化转换器
     */
    async initialize() {
        this.isInitialized = true;
        console.log('HTML到Markdown转换器初始化完成');
    }

    /**
     * 设置转换规则
     */
    setupConversionRules() {
        return {
            // 标题转换
            headings: {
                h1: '# ',
                h2: '## ',
                h3: '### ',
                h4: '#### ',
                h5: '##### ',
                h6: '###### '
            },
            
            // 文本格式转换
            formatting: {
                strong: '**',
                b: '**',
                em: '*',
                i: '*',
                code: '`',
                del: '~~',
                s: '~~'
            },
            
            // 块级元素
            blocks: {
                p: '\n\n',
                div: '\n\n',
                br: '\n',
                hr: '\n---\n'
            },
            
            // 列表
            lists: {
                ul: 'unordered',
                ol: 'ordered'
            }
        };
    }

    /**
     * 将HTML转换为Markdown
     * @param {string} html - HTML内容
     * @param {Object} options - 转换选项
     * @returns {string} Markdown内容
     */
    convertToMarkdown(html, options = {}) {
        if (!this.isInitialized) {
            throw new Error('转换器未初始化');
        }

        if (!html || typeof html !== 'string') {
            return '';
        }

        try {
            // 创建临时DOM元素
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // 清理HTML
            this.cleanHTML(tempDiv);

            // 转换为Markdown
            const markdown = this.processElement(tempDiv, options);

            // 后处理清理
            return this.postProcessMarkdown(markdown);

        } catch (error) {
            console.error('HTML到Markdown转换失败:', error);
            throw new Error('转换失败: ' + error.message);
        }
    }

    /**
     * 清理HTML内容
     * @param {Element} element - DOM元素
     */
    cleanHTML(element) {
        // 移除脚本和样式
        const unwantedElements = element.querySelectorAll('script, style, noscript, meta, link');
        unwantedElements.forEach(el => el.remove());

        // 移除注释节点
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_COMMENT,
            null,
            false
        );

        const comments = [];
        let node;
        while (node = walker.nextNode()) {
            comments.push(node);
        }
        comments.forEach(comment => comment.remove());

        // 清理空白属性
        const allElements = element.querySelectorAll('*');
        allElements.forEach(el => {
            // 保留有意义的属性
            const keepAttributes = ['href', 'src', 'alt', 'title'];
            const attributes = Array.from(el.attributes);
            
            attributes.forEach(attr => {
                if (!keepAttributes.includes(attr.name)) {
                    el.removeAttribute(attr.name);
                }
            });
        });
    }

    /**
     * 处理DOM元素
     * @param {Element} element - DOM元素
     * @param {Object} options - 转换选项
     * @returns {string} Markdown文本
     */
    processElement(element, options = {}) {
        let result = '';
        
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                result += this.processTextNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                result += this.processElementNode(node, options);
            }
        }
        
        return result;
    }

    /**
     * 处理文本节点
     * @param {Text} textNode - 文本节点
     * @returns {string} 处理后的文本
     */
    processTextNode(textNode) {
        let text = textNode.textContent || '';
        
        // 清理多余的空白字符
        text = text.replace(/\s+/g, ' ');
        
        return text;
    }

    /**
     * 处理元素节点
     * @param {Element} element - 元素节点
     * @param {Object} options - 转换选项
     * @returns {string} Markdown文本
     */
    processElementNode(element, options) {
        const tagName = element.tagName.toLowerCase();
        let content = this.processElement(element, options);
        
        switch (tagName) {
            case 'h1':
            case 'h2':
            case 'h3':
            case 'h4':
            case 'h5':
            case 'h6':
                return this.convertHeading(content, tagName);
                
            case 'p':
                return this.convertParagraph(content);
                
            case 'strong':
            case 'b':
                return this.convertBold(content);
                
            case 'em':
            case 'i':
                return this.convertItalic(content);
                
            case 'code':
                return this.convertInlineCode(content);
                
            case 'pre':
                return this.convertCodeBlock(content);
                
            case 'a':
                return this.convertLink(element, content);
                
            case 'img':
                return this.convertImage(element);
                
            case 'ul':
                return this.convertUnorderedList(element, options);
                
            case 'ol':
                return this.convertOrderedList(element, options);
                
            case 'li':
                return content; // 由父列表处理
                
            case 'blockquote':
                return this.convertBlockquote(content);
                
            case 'br':
                return '\n';
                
            case 'hr':
                return '\n---\n';
                
            case 'div':
                return this.convertDiv(content);
                
            case 'span':
                return content;
                
            case 'table':
                return this.convertTable(element);
                
            default:
                return content;
        }
    }

    /**
     * 转换标题
     * @param {string} content - 内容
     * @param {string} level - 标题级别
     * @returns {string} Markdown标题
     */
    convertHeading(content, level) {
        const prefix = this.conversionRules.headings[level] || '# ';
        return `\n${prefix}${content.trim()}\n\n`;
    }

    /**
     * 转换段落
     * @param {string} content - 内容
     * @returns {string} Markdown段落
     */
    convertParagraph(content) {
        const trimmed = content.trim();
        return trimmed ? `\n${trimmed}\n\n` : '';
    }

    /**
     * 转换粗体
     * @param {string} content - 内容
     * @returns {string} Markdown粗体
     */
    convertBold(content) {
        return `**${content}**`;
    }

    /**
     * 转换斜体
     * @param {string} content - 内容
     * @returns {string} Markdown斜体
     */
    convertItalic(content) {
        return `*${content}*`;
    }

    /**
     * 转换行内代码
     * @param {string} content - 内容
     * @returns {string} Markdown行内代码
     */
    convertInlineCode(content) {
        return `\`${content}\``;
    }

    /**
     * 转换代码块
     * @param {string} content - 内容
     * @returns {string} Markdown代码块
     */
    convertCodeBlock(content) {
        return `\n\`\`\`\n${content.trim()}\n\`\`\`\n\n`;
    }

    /**
     * 转换链接
     * @param {Element} element - 链接元素
     * @param {string} content - 链接文本
     * @returns {string} Markdown链接
     */
    convertLink(element, content) {
        const href = element.getAttribute('href');
        const title = element.getAttribute('title');
        
        if (!href) {
            return content;
        }
        
        if (title) {
            return `[${content}](${href} "${title}")`;
        } else {
            return `[${content}](${href})`;
        }
    }

    /**
     * 转换图片
     * @param {Element} element - 图片元素
     * @returns {string} Markdown图片
     */
    convertImage(element) {
        const src = element.getAttribute('src');
        const alt = element.getAttribute('alt') || '';
        const title = element.getAttribute('title');
        
        if (!src) {
            return '';
        }
        
        if (title) {
            return `![${alt}](${src} "${title}")`;
        } else {
            return `![${alt}](${src})`;
        }
    }

    /**
     * 转换无序列表
     * @param {Element} element - 列表元素
     * @param {Object} options - 转换选项
     * @returns {string} Markdown列表
     */
    convertUnorderedList(element, options) {
        const items = Array.from(element.children).filter(child => 
            child.tagName.toLowerCase() === 'li'
        );
        
        const listItems = items.map(item => {
            const content = this.processElement(item, options).trim();
            return `- ${content}`;
        });
        
        return `\n${listItems.join('\n')}\n\n`;
    }

    /**
     * 转换有序列表
     * @param {Element} element - 列表元素
     * @param {Object} options - 转换选项
     * @returns {string} Markdown列表
     */
    convertOrderedList(element, options) {
        const items = Array.from(element.children).filter(child => 
            child.tagName.toLowerCase() === 'li'
        );
        
        const listItems = items.map((item, index) => {
            const content = this.processElement(item, options).trim();
            return `${index + 1}. ${content}`;
        });
        
        return `\n${listItems.join('\n')}\n\n`;
    }

    /**
     * 转换引用块
     * @param {string} content - 内容
     * @returns {string} Markdown引用
     */
    convertBlockquote(content) {
        const lines = content.trim().split('\n');
        const quotedLines = lines.map(line => `> ${line}`);
        return `\n${quotedLines.join('\n')}\n\n`;
    }

    /**
     * 转换div
     * @param {string} content - 内容
     * @returns {string} 处理后的内容
     */
    convertDiv(content) {
        const trimmed = content.trim();
        return trimmed ? `\n${trimmed}\n` : '';
    }

    /**
     * 转换表格
     * @param {Element} element - 表格元素
     * @returns {string} Markdown表格
     */
    convertTable(element) {
        const rows = Array.from(element.querySelectorAll('tr'));
        
        if (rows.length === 0) {
            return '';
        }
        
        const tableRows = [];
        let isFirstRow = true;
        
        for (const row of rows) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            const cellContents = cells.map(cell => 
                this.processElement(cell).trim().replace(/\n/g, ' ')
            );
            
            tableRows.push(`| ${cellContents.join(' | ')} |`);
            
            // 添加表头分隔符
            if (isFirstRow && element.querySelector('th')) {
                const separator = cells.map(() => '---').join(' | ');
                tableRows.push(`| ${separator} |`);
                isFirstRow = false;
            }
        }
        
        return `\n${tableRows.join('\n')}\n\n`;
    }

    /**
     * 后处理Markdown内容
     * @param {string} markdown - 原始Markdown
     * @returns {string} 清理后的Markdown
     */
    postProcessMarkdown(markdown) {
        return markdown
            // 移除多余的空行
            .replace(/\n{3,}/g, '\n\n')
            // 清理行首行尾空白
            .replace(/^[ \t]+|[ \t]+$/gm, '')
            // 修复列表项间距
            .replace(/(\n- .+)\n\n(\n- )/g, '$1\n$2')
            .replace(/(\n\d+\. .+)\n\n(\n\d+\. )/g, '$1\n$2')
            // 清理首尾空白
            .trim();
    }

    /**
     * 转换HTML文档为Markdown
     * @param {string} html - 完整HTML文档
     * @param {Object} options - 转换选项
     * @returns {Object} 转换结果
     */
    convertDocument(html, options = {}) {
        try {
            // 提取标题
            const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : '';

            // 提取body内容
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            const bodyHTML = bodyMatch ? bodyMatch[1] : html;

            // 转换为Markdown
            const markdown = this.convertToMarkdown(bodyHTML, options);

            return {
                title: title,
                markdown: markdown,
                wordCount: this.countWords(markdown),
                characterCount: markdown.length
            };

        } catch (error) {
            console.error('文档转换失败:', error);
            throw new Error('文档转换失败: ' + error.message);
        }
    }

    /**
     * 统计单词数
     * @param {string} text - 文本内容
     * @returns {number} 单词数
     */
    countWords(text) {
        if (!text) return 0;
        
        // 移除Markdown标记
        const cleanText = text
            .replace(/[#*`\[\]()]/g, '')
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[.*?\]\(.*?\)/g, '');
        
        // 统计单词
        const words = cleanText.match(/[\w\u4e00-\u9fff]+/g);
        return words ? words.length : 0;
    }

    /**
     * 验证转换结果
     * @param {string} originalHTML - 原始HTML
     * @param {string} markdown - 转换后的Markdown
     * @returns {Object} 验证结果
     */
    validateConversion(originalHTML, markdown) {
        try {
            // 提取原始文本
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = originalHTML;
            
            // 移除脚本和样式
            const unwanted = tempDiv.querySelectorAll('script, style, noscript');
            unwanted.forEach(el => el.remove());
            
            const originalText = tempDiv.textContent || '';
            const originalWordCount = this.countWords(originalText);
            const markdownWordCount = this.countWords(markdown);
            
            // 计算保留率
            const retentionRate = originalWordCount > 0 ? 
                (markdownWordCount / originalWordCount) * 100 : 100;
            
            return {
                isValid: retentionRate >= 80, // 至少保留80%的内容
                retentionRate: retentionRate,
                originalWordCount: originalWordCount,
                markdownWordCount: markdownWordCount,
                hasStructure: this.hasMarkdownStructure(markdown)
            };
            
        } catch (error) {
            console.error('转换验证失败:', error);
            return {
                isValid: false,
                error: error.message
            };
        }
    }

    /**
     * 检查Markdown是否有结构
     * @param {string} markdown - Markdown内容
     * @returns {boolean} 是否有结构
     */
    hasMarkdownStructure(markdown) {
        // 检查是否包含Markdown结构元素
        const structurePatterns = [
            /^#{1,6}\s/m,     // 标题
            /^\*\s/m,         // 无序列表
            /^\d+\.\s/m,      // 有序列表
            /\*\*.*?\*\*/,    // 粗体
            /\*.*?\*/,        // 斜体
            /\[.*?\]\(.*?\)/, // 链接
            /!\[.*?\]\(.*?\)/ // 图片
        ];
        
        return structurePatterns.some(pattern => pattern.test(markdown));
    }

    /**
     * 清理资源
     */
    destroy() {
        this.isInitialized = false;
        this.conversionRules = null;
    }
}