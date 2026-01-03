/**
 * 项目结构验证脚本
 * 在Node.js环境中验证文件结构
 */

const fs = require('fs');
const path = require('path');

class StructureValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * 检查文件是否存在
     * @param {string} filePath - 文件路径
     * @param {boolean} required - 是否必需
     */
    checkFile(filePath, required = true) {
        const exists = fs.existsSync(filePath);
        
        if (!exists && required) {
            this.errors.push(`必需文件不存在: ${filePath}`);
        } else if (!exists && !required) {
            this.warnings.push(`可选文件不存在: ${filePath}`);
        } else {
            console.log(`✅ 文件存在: ${filePath}`);
        }
        
        return exists;
    }

    /**
     * 检查目录是否存在
     * @param {string} dirPath - 目录路径
     * @param {boolean} required - 是否必需
     */
    checkDirectory(dirPath, required = true) {
        const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
        
        if (!exists && required) {
            this.errors.push(`必需目录不存在: ${dirPath}`);
        } else if (!exists && !required) {
            this.warnings.push(`可选目录不存在: ${dirPath}`);
        } else {
            console.log(`✅ 目录存在: ${dirPath}`);
        }
        
        return exists;
    }

    /**
     * 检查文件内容
     * @param {string} filePath - 文件路径
     * @param {string} expectedContent - 期望包含的内容
     */
    checkFileContent(filePath, expectedContent) {
        if (!this.checkFile(filePath)) return false;
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const contains = content.includes(expectedContent);
            
            if (contains) {
                console.log(`✅ 文件内容检查通过: ${filePath}`);
            } else {
                this.errors.push(`文件内容检查失败: ${filePath} 不包含 "${expectedContent}"`);
            }
            
            return contains;
        } catch (error) {
            this.errors.push(`读取文件失败: ${filePath} - ${error.message}`);
            return false;
        }
    }

    /**
     * 验证项目结构
     */
    validateStructure() {
        console.log('开始验证项目结构...\n');

        // 检查主要文件
        console.log('检查主要文件:');
        this.checkFile('index.html');
        this.checkFile('manifest.json');
        this.checkFile('README.md');

        // 检查目录结构
        console.log('\n检查目录结构:');
        this.checkDirectory('styles');
        this.checkDirectory('js');
        this.checkDirectory('js/modules');
        this.checkDirectory('tests');

        // 检查样式文件
        console.log('\n检查样式文件:');
        this.checkFile('styles/main.css');

        // 检查JavaScript文件
        console.log('\n检查JavaScript文件:');
        this.checkFile('js/main.js');
        this.checkFile('js/modules/UIController.js');
        this.checkFile('js/modules/BrowserEngine.js');
        this.checkFile('js/modules/ContentDetector.js');
        this.checkFile('js/modules/DownloadManager.js');
        this.checkFile('js/modules/SecurityManager.js');
        this.checkFile('js/modules/ProxyService.js');
        this.checkFile('js/modules/MobileAdaptationManager.js');

        // 检查测试文件
        console.log('\n检查测试文件:');
        this.checkFile('tests/test-framework.js');
        this.checkFile('tests/project-structure.test.js');
        this.checkFile('tests/test-runner.html');

        // 检查HTML内容
        console.log('\n检查HTML内容:');
        this.checkFileContent('index.html', 'viewport');
        this.checkFileContent('index.html', 'apple-mobile-web-app-capable');
        this.checkFileContent('index.html', 'media-download-btn');
        this.checkFileContent('index.html', 'text-download-btn');
        this.checkFileContent('index.html', 'pdf-download-btn');

        // 检查CSS内容
        console.log('\n检查CSS内容:');
        this.checkFileContent('styles/main.css', '--touch-target-min: 44px');
        this.checkFileContent('styles/main.css', '@media (max-width: 768px)');
        this.checkFileContent('styles/main.css', 'prefers-reduced-motion');

        // 检查JavaScript模块导出
        console.log('\n检查JavaScript模块:');
        this.checkFileContent('js/modules/UIController.js', 'export class UIController');
        this.checkFileContent('js/modules/BrowserEngine.js', 'export class BrowserEngine');
        this.checkFileContent('js/modules/ContentDetector.js', 'export class ContentDetector');
        this.checkFileContent('js/modules/DownloadManager.js', 'export class DownloadManager');
        this.checkFileContent('js/modules/SecurityManager.js', 'export class SecurityManager');
        this.checkFileContent('js/modules/ProxyService.js', 'export class ProxyService');
        this.checkFileContent('js/modules/MobileAdaptationManager.js', 'export class MobileAdaptationManager');

        // 检查manifest.json内容
        console.log('\n检查PWA配置:');
        this.checkFileContent('manifest.json', '"name"');
        this.checkFileContent('manifest.json', '"display": "standalone"');
    }

    /**
     * 打印验证结果
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('项目结构验证结果:');
        
        if (this.errors.length === 0) {
            console.log('✅ 所有必需文件和结构都存在');
        } else {
            console.log(`❌ 发现 ${this.errors.length} 个错误:`);
            this.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log(`⚠️ 发现 ${this.warnings.length} 个警告:`);
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
        
        console.log('='.repeat(50));
        
        return this.errors.length === 0;
    }
}

// 运行验证
const validator = new StructureValidator();
validator.validateStructure();
const success = validator.printResults();

process.exit(success ? 0 : 1);