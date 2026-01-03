/**
 * 简单的测试框架
 */
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    /**
     * 定义测试用例
     * @param {string} description - 测试描述
     * @param {Function} testFn - 测试函数
     */
    test(description, testFn) {
        this.tests.push({ description, testFn });
    }

    /**
     * 断言函数
     * @param {*} actual - 实际值
     * @param {*} expected - 期望值
     * @param {string} message - 错误消息
     */
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`断言失败: ${message}\n期望: ${expected}\n实际: ${actual}`);
        }
    }

    /**
     * 断言真值
     * @param {*} value - 要检查的值
     * @param {string} message - 错误消息
     */
    assertTrue(value, message = '') {
        if (!value) {
            throw new Error(`断言失败: ${message}\n期望: true\n实际: ${value}`);
        }
    }

    /**
     * 断言假值
     * @param {*} value - 要检查的值
     * @param {string} message - 错误消息
     */
    assertFalse(value, message = '') {
        if (value) {
            throw new Error(`断言失败: ${message}\n期望: false\n实际: ${value}`);
        }
    }

    /**
     * 断言元素存在
     * @param {string} selector - CSS选择器
     * @param {string} message - 错误消息
     */
    assertElementExists(selector, message = '') {
        const element = document.querySelector(selector);
        if (!element) {
            throw new Error(`断言失败: ${message}\n元素不存在: ${selector}`);
        }
        return element;
    }

    /**
     * 断言元素不存在
     * @param {string} selector - CSS选择器
     * @param {string} message - 错误消息
     */
    assertElementNotExists(selector, message = '') {
        const element = document.querySelector(selector);
        if (element) {
            throw new Error(`断言失败: ${message}\n元素不应存在: ${selector}`);
        }
    }

    /**
     * 断言CSS样式
     * @param {string} selector - CSS选择器
     * @param {string} property - CSS属性
     * @param {string} expectedValue - 期望值
     * @param {string} message - 错误消息
     */
    assertCSSProperty(selector, property, expectedValue, message = '') {
        const element = this.assertElementExists(selector);
        const computedStyle = window.getComputedStyle(element);
        const actualValue = computedStyle.getPropertyValue(property);
        
        if (actualValue !== expectedValue) {
            throw new Error(`断言失败: ${message}\nCSS属性 ${property}\n期望: ${expectedValue}\n实际: ${actualValue}`);
        }
    }

    /**
     * 运行所有测试
     */
    async runTests() {
        console.log('开始运行测试...\n');
        
        this.results = { passed: 0, failed: 0, total: this.tests.length };
        
        for (const test of this.tests) {
            try {
                console.log(`运行测试: ${test.description}`);
                await test.testFn.call(this);
                console.log(`✅ 通过: ${test.description}\n`);
                this.results.passed++;
            } catch (error) {
                console.error(`❌ 失败: ${test.description}`);
                console.error(`错误: ${error.message}\n`);
                this.results.failed++;
            }
        }
        
        this.printResults();
        return this.results;
    }

    /**
     * 打印测试结果
     */
    printResults() {
        console.log('='.repeat(50));
        console.log('测试结果:');
        console.log(`总计: ${this.results.total}`);
        console.log(`通过: ${this.results.passed}`);
        console.log(`失败: ${this.results.failed}`);
        console.log(`成功率: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));
    }

    /**
     * 等待指定时间
     * @param {number} ms - 毫秒数
     */
    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出测试框架
window.TestFramework = TestFramework;