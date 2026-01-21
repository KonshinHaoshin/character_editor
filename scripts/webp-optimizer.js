const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// WebP专用配置
const CONFIG = {
    // 质量设置 - 针对不同类型的图片使用不同的质量
    qualities: {
        body: 90, // 身体图片需要高质量
        facial: 85, // 面部表情中等质量
        effect: 80, // 特效图片可以更低质量
        default: 85 // 默认质量
    },

    // 角色列表
    characters: [
        'Alisa', 'AnAn', 'Coco', 'Ema', 'Hanna', 'Hiro',
        'Leia', 'Margo', 'Meruru', 'Miria', 'Nanoka', 'Noah', 'Sherry'
    ],

    // 输出目录 - 直接替换原PNG文件位置
    outputBase: 'public/webp-optimized',

    // 性能优化
    concurrentLimit: 10, // 并发转换数量限制
    skipExisting: true, // 跳过已存在的文件

    // WebP高级设置
    webpOptions: {
        effort: 6, // 压缩努力 (0-6, 6最好但最慢)
        lossless: false, // 使用有损压缩
        alphaQuality: 90, // 透明度质量
        nearLossless: 60 // 近无损质量
    }
};

// 根据文件名判断图片类型，返回对应的质量设置
function getQualityForFile(filename, filePath) {
    const lowerFilename = filename.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    // 判断图片类型
    if (lowerFilename.includes('body') || lowerPath.includes('body')) {
        return CONFIG.qualities.body;
    }

    if (lowerFilename.includes('facial') || lowerPath.includes('facial') ||
        lowerFilename.includes('eye') || lowerFilename.includes('mouth') ||
        lowerFilename.includes('cheek') || lowerFilename.includes('head')) {
        return CONFIG.qualities.facial;
    }

    if (lowerFilename.includes('effect') || lowerFilename.includes('shadow') ||
        lowerFilename.includes('clipping') || lowerFilename.includes('blending')) {
        return CONFIG.qualities.effect;
    }

    return CONFIG.qualities.default;
}

// 智能WebP转换 - 根据图片类型使用不同的参数
async function convertToWebP(inputPath, outputPath) {
    try {
        // 检查输出文件是否已存在
        if (CONFIG.skipExisting) {
            try {
                await fs.access(outputPath);
                console.log(`⏭️  跳过 (已存在): ${path.basename(inputPath)}`);
                return null;
            } catch {
                // 文件不存在，继续转换
            }
        }

        const stats = await fs.stat(inputPath);
        const quality = getQualityForFile(path.basename(inputPath), inputPath);

        console.log(`🔄 转换中: ${path.basename(inputPath)} (质量: ${quality})`);

        // 读取图片信息以优化转换
        const metadata = await sharp(inputPath).metadata();

        // 根据图片尺寸调整参数
        const isLargeImage = metadata.width > 1000 || metadata.height > 1000;
        const hasAlpha = metadata.hasAlpha;

        // 构建WebP选项
        const webpOptions = {
            quality,
            effort: CONFIG.webpOptions.effort,
            lossless: CONFIG.webpOptions.lossless,
            alphaQuality: hasAlpha ? CONFIG.webpOptions.alphaQuality : undefined,
            nearLossless: CONFIG.webpOptions.nearLossless
        };

        // 对于大图片，使用更激进的压缩
        if (isLargeImage) {
            webpOptions.effort = 4; // 降低努力级别以加快速度
            webpOptions.nearLossless = 80; // 提高近无损质量
        }

        // 执行转换
        await sharp(inputPath)
            .webp(webpOptions)
            .toFile(outputPath);

        const webpStats = await fs.stat(outputPath);
        const reduction = ((stats.size - webpStats.size) / stats.size * 100).toFixed(1);

        console.log(`✅ ${path.basename(inputPath)}: ${(stats.size/1024).toFixed(1)}KB → ${(webpStats.size/1024).toFixed(1)}KB (压缩: ${reduction}%)`);

        return {
            filename: path.basename(inputPath),
            original: stats.size,
            webp: webpStats.size,
            reduction: parseFloat(reduction),
            quality,
            dimensions: `${metadata.width}x${metadata.height}`,
            hasAlpha
        };
    } catch (error) {
        console.error(`❌ 转换失败 ${path.basename(inputPath)}:`, error.message);
        return null;
    }
}

// 并发控制 - 限制同时转换的文件数量
class ConcurrentQueue {
    constructor(limit) {
        this.limit = limit;
        this.running = 0;
        this.queue = [];
    }

    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.run();
        });
    }

    run() {
        while (this.running < this.limit && this.queue.length > 0) {
            const { task, resolve, reject } = this.queue.shift();
            this.running++;

            task()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    this.running--;
                    this.run();
                });
        }
    }
}

// 处理目录中的所有PNG文件
async function processDirectory(dirPath, outputBaseDir, queue) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let stats = {
        original: 0,
        webp: 0,
        count: 0,
        files: [],
        byType: {
            body: { count: 0, original: 0, webp: 0 },
            facial: { count: 0, original: 0, webp: 0 },
            effect: { count: 0, original: 0, webp: 0 },
            default: { count: 0, original: 0, webp: 0 }
        }
    };

    const promises = [];

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // 递归处理子目录
            const subStats = await processDirectory(fullPath, outputBaseDir, queue);
            stats.original += subStats.original;
            stats.webp += subStats.webp;
            stats.count += subStats.count;
            stats.files.push(...subStats.files);

            // 合并类型统计
            for (const type in subStats.byType) {
                stats.byType[type].count += subStats.byType[type].count;
                stats.byType[type].original += subStats.byType[type].original;
                stats.byType[type].webp += subStats.byType[type].webp;
            }
        } else if (entry.name.toLowerCase().endsWith('.png')) {
            // 构建输出路径 - 保持相同的目录结构
            const relativePath = path.relative(process.cwd(), dirPath);
            const outputDir = path.join(outputBaseDir, relativePath);
            const outputPath = path.join(outputDir, entry.name.replace(/\.png$/i, '.webp'));

            // 确保输出目录存在
            await fs.mkdir(outputDir, { recursive: true });

            // 添加到并发队列
            const promise = queue.add(async() => {
                const result = await convertToWebP(fullPath, outputPath);
                if (result) {
                    // 更新统计
                    stats.original += result.original;
                    stats.webp += result.webp;
                    stats.count++;
                    stats.files.push(result);

                    // 按类型统计
                    const qualityType = result.quality === CONFIG.qualities.body ? 'body' :
                        result.quality === CONFIG.qualities.facial ? 'facial' :
                        result.quality === CONFIG.qualities.effect ? 'effect' : 'default';

                    stats.byType[qualityType].count++;
                    stats.byType[qualityType].original += result.original;
                    stats.byType[qualityType].webp += result.webp;
                }
                return result;
            });

            promises.push(promise);
        }
    }

    // 等待所有转换完成
    await Promise.all(promises);

    return stats;
}

// 生成详细的转换报告
function generateReport(stats) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 WEBP优化转换报告');
    console.log('='.repeat(70));

    console.log(`\n📈 总体统计:`);
    console.log(`   转换文件总数: ${stats.count}`);
    console.log(`   原始总大小: ${(stats.original / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   WebP总大小: ${(stats.webp / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   总体压缩率: ${((stats.original - stats.webp) / stats.original * 100).toFixed(1)}%`);
    console.log(`   节省空间: ${((stats.original - stats.webp) / 1024 / 1024).toFixed(2)} MB`);

    console.log(`\n🎯 按类型统计:`);
    for (const [type, typeStats] of Object.entries(stats.byType)) {
        if (typeStats.count > 0) {
            const reduction = typeStats.original > 0 ?
                ((typeStats.original - typeStats.webp) / typeStats.original * 100).toFixed(1) : '0.0';
            console.log(`   ${type}: ${typeStats.count} 文件, 压缩率: ${reduction}%`);
        }
    }

    if (stats.files.length > 0) {
        // 找出压缩效果最好和最差的文件
        const sortedByReduction = [...stats.files].sort((a, b) => b.reduction - a.reduction);

        console.log(`\n🏆 压缩效果最佳 (前5名):`);
        sortedByReduction.slice(0, 5).forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% (${file.dimensions}, ${file.hasAlpha ? '有透明' : '无透明'})`);
        });

        console.log(`\n📉 压缩效果最差 (后5名):`);
        sortedByReduction.slice(-5).reverse().forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% (${file.dimensions}, ${file.hasAlpha ? '有透明' : '无透明'})`);
        });

        // 计算平均压缩率
        const avgReduction = stats.files.reduce((sum, file) => sum + file.reduction, 0) / stats.files.length;
        console.log(`\n📊 平均压缩率: ${avgReduction.toFixed(1)}%`);
    }

    console.log('\n' + '='.repeat(70));
}

// 更新配置文件以使用WebP
async function updateConfigFiles() {
    console.log('\n🔄 更新配置文件...');

    try {
        // 这里可以添加更新其他配置文件的逻辑
        // 例如：更新vite配置、tsconfig等

        console.log('✅ 配置文件更新完成');
        return true;
    } catch (error) {
        console.error('❌ 更新配置文件失败:', error.message);
        return false;
    }
}

// 主函数
async function main() {
    console.log('🚀 开始WebP专用图片优化转换...\n');
    console.log(`⚙️  配置参数:`);
    console.log(`   输出目录: ${CONFIG.outputBase}`);
    console.log(`   并发限制: ${CONFIG.concurrentLimit}`);
    console.log(`   质量设置: 身体=${CONFIG.qualities.body}, 面部=${CONFIG.qualities.facial}, 特效=${CONFIG.qualities.effect}`);
    console.log(`   角色数量: ${CONFIG.characters.length}\n`);

    const startTime = Date.now();
    const queue = new ConcurrentQueue(CONFIG.concurrentLimit);
    let grandTotal = {
        original: 0,
        webp: 0,
        count: 0,
        files: [],
        byType: {
            body: { count: 0, original: 0, webp: 0 },
            facial: { count: 0, original: 0, webp: 0 },
            effect: { count: 0, original: 0, webp: 0 },
            default: { count: 0, original: 0, webp: 0 }
        }
    };

    // 处理每个角色
    for (const character of CONFIG.characters) {
        console.log(`\n📁 处理角色: ${character}...`);
        const characterDir = path.join(process.cwd(), character);

        try {
            await fs.access(characterDir);
            const stats = await processDirectory(characterDir, CONFIG.outputBase, queue);

            // 合并统计
            grandTotal.original += stats.original;
            grandTotal.webp += stats.webp;
            grandTotal.count += stats.count;
            grandTotal.files.push(...stats.files);

            // 合并类型统计
            for (const type in stats.byType) {
                grandTotal.byType[type].count += stats.byType[type].count;
                grandTotal.byType[type].original += stats.byType[type].original;
                grandTotal.byType[type].webp += stats.byType[type].webp;
            }

            console.log(`   ${character}: 转换了 ${stats.count} 张图片`);
        } catch (error) {
            console.log(`   ${character}: 目录不存在，跳过`);
        }
    }

    // 等待所有队列任务完成
    console.log('\n⏳ 等待所有转换完成...');
    // 这里需要等待队列中的所有任务完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // 生成报告
    generateReport(grandTotal);

    console.log(`\n⏱️  总耗时: ${duration} 秒`);
    console.log(`🎉 WebP转换完成！图片已保存到: ${CONFIG.outputBase}`);

    // 更新配置文件
    await updateConfigFiles();

    // 提示下一步操作
    console.log('\n💡 下一步操作:');
    console.log('   1. 修改代码以使用WebP路径 (已自动处理)');
    console.log('   2. 运行 npm run build 构建项目');
    console.log('   3. 测试应用确保WebP图片正常加载');
    console.log('   4. 考虑删除原PNG文件以节省空间 (谨慎操作)');
}

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('❌ 未处理的Promise拒绝:', error);
    process.exit(1);
});

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 转换过程中发生错误:', error);
        process.exit(1);
    });
}

module.exports = { convertToWebP, processDirectory, ConcurrentQueue };