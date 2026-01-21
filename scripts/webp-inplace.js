const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// WebP原地转换配置
const CONFIG = {
    // 质量设置 - 统一使用最高质量100
    quality: 100, // 统一最高质量

    // 角色列表
    characters: [
        'Alisa', 'AnAn', 'Coco', 'Ema', 'Hanna', 'Hiro',
        'Leia', 'Margo', 'Meruru', 'Miria', 'Nanoka', 'Noah', 'Sherry'
    ],

    // 性能优化
    concurrentLimit: 10, // 并发转换数量限制
    backupOriginal: false, // 不备份原始PNG文件
    deleteOriginal: true, // 转换后直接删除原始PNG文件

    // WebP高级设置
    webpOptions: {
        effort: 6, // 压缩努力 (0-6, 6最好但最慢)
        lossless: true, // 使用无损压缩（质量100时）
        alphaQuality: 100 // 透明度质量
    }
};

// 获取质量设置 - 统一返回100
function getQualityForFile() {
    return CONFIG.quality; // 统一返回100
}

// 原地转换PNG为WebP
async function convertInPlace(inputPath) {
    try {
        const dirname = path.dirname(inputPath);
        const filename = path.basename(inputPath);
        const webpPath = path.join(dirname, filename.replace(/\.png$/i, '.webp'));

        // 检查WebP文件是否已存在
        try {
            await fs.access(webpPath);
            console.log(`⏭️  跳过 (WebP已存在): ${filename}`);
            return null;
        } catch {
            // WebP文件不存在，继续转换
        }

        const stats = await fs.stat(inputPath);
        const quality = getQualityForFile();

        console.log(`🔄 转换中: ${filename} (质量: ${quality})`);

        // 读取图片信息以优化转换
        const metadata = await sharp(inputPath).metadata();

        // 根据图片尺寸调整参数
        const isLargeImage = metadata.width > 1000 || metadata.height > 1000;
        const hasAlpha = metadata.hasAlpha;

        // 构建WebP选项 - 使用无损压缩，质量100
        const webpOptions = {
            quality: CONFIG.quality,
            effort: CONFIG.webpOptions.effort,
            lossless: CONFIG.webpOptions.lossless,
            alphaQuality: hasAlpha ? CONFIG.webpOptions.alphaQuality : undefined
        };

        // 对于大图片，降低努力级别以加快速度
        if (isLargeImage) {
            webpOptions.effort = 4;
        }

        // 执行转换
        await sharp(inputPath)
            .webp(webpOptions)
            .toFile(webpPath);

        const webpStats = await fs.stat(webpPath);
        const reduction = ((stats.size - webpStats.size) / stats.size * 100).toFixed(1);

        console.log(`✅ ${filename}: ${(stats.size/1024).toFixed(1)}KB → ${(webpStats.size/1024).toFixed(1)}KB (压缩: ${reduction}%)`);

        // 备份原始PNG文件（可选）
        if (CONFIG.backupOriginal) {
            const backupPath = path.join(dirname, filename.replace(/\.png$/i, '.png.backup'));
            await fs.copyFile(inputPath, backupPath);
        }

        // 删除原始PNG文件（谨慎！）
        if (CONFIG.deleteOriginal) {
            await fs.unlink(inputPath);
            console.log(`🗑️  已删除原始PNG: ${filename}`);
        }

        return {
            filename,
            original: stats.size,
            webp: webpStats.size,
            reduction: parseFloat(reduction),
            quality,
            dimensions: `${metadata.width}x${metadata.height}`,
            hasAlpha,
            webpPath
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
async function processDirectory(dirPath, queue) {
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
            const subStats = await processDirectory(fullPath, queue);
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
            // 添加到并发队列进行原地转换
            const promise = queue.add(async() => {
                const result = await convertInPlace(fullPath);
                if (result) {
                    // 更新统计
                    stats.original += result.original;
                    stats.webp += result.webp;
                    stats.count++;
                    stats.files.push(result);

                    // 统一质量，不需要按类型统计
                    stats.byType.default.count++;
                    stats.byType.default.original += result.original;
                    stats.byType.default.webp += result.webp;
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
    console.log('📊 WebP原地转换报告');
    console.log('='.repeat(70));

    console.log(`\n📈 总体统计:`);
    console.log(`   转换文件总数: ${stats.count}`);
    console.log(`   原始PNG总大小: ${(stats.original / 1024 / 1024).toFixed(2)} MB`);
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
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% (${file.dimensions})`);
        });

        console.log(`\n📉 压缩效果最差 (后5名):`);
        sortedByReduction.slice(-5).reverse().forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% (${file.dimensions})`);
        });

        // 计算平均压缩率
        const avgReduction = stats.files.reduce((sum, file) => sum + file.reduction, 0) / stats.files.length;
        console.log(`\n📊 平均压缩率: ${avgReduction.toFixed(1)}%`);
    }

    console.log('\n' + '='.repeat(70));
}

// 恢复原始配置（将路径改回PNG）
async function restoreParserConfig() {
    console.log('\n🔄 恢复原始配置...');

    try {
        const parserPath = path.join(process.cwd(), 'src', 'utils', 'parser.ts');
        let content = await fs.readFile(parserPath, 'utf8');

        // 将WebP路径改回PNG路径
        content = content.replace(
            /const webpPath = `\.\/webp-optimized\/\$\{characterName\}\/\$\{group\}\/\$\{name\}\.webp`;/,
            `const pngPath = \`./\${characterName}/\${group}/\${name}.png\`;`
        );

        content = content.replace(
            /path: webpPath, \/\/ 只使用WebP/,
            `path: pngPath,`
        );

        await fs.writeFile(parserPath, content, 'utf8');
        console.log('✅ 已恢复原始PNG路径配置');

        return true;
    } catch (error) {
        console.error('❌ 恢复配置失败:', error.message);
        return false;
    }
}

// 主函数
async function main() {
    console.log('🚀 开始WebP原地转换（不改变路径）...\n');
    console.log(`⚙️  配置参数:`);
    console.log(`   备份原始PNG: ${CONFIG.backupOriginal ? '是' : '否'}`);
    console.log(`   删除原始PNG: ${CONFIG.deleteOriginal ? '是（直接替换）' : '否'}`);
    console.log(`   并发限制: ${CONFIG.concurrentLimit}`);
    console.log(`   质量设置: 统一质量=${CONFIG.quality}`);
    console.log(`   压缩模式: ${CONFIG.webpOptions.lossless ? '无损' : '有损'}`);
    console.log(`   角色数量: ${CONFIG.characters.length}\n`);

    if (CONFIG.deleteOriginal) {
        console.log('⚠️  警告：已启用删除原始PNG文件功能！');
        console.log('   原始PNG文件将在转换后被删除，请确保已备份重要文件！\n');
    }

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
            const stats = await processDirectory(characterDir, queue);

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
    console.log(`🎉 WebP原地转换完成！`);

    // 恢复原始配置（如果需要）
    await restoreParserConfig();

    // 提示下一步操作
    console.log('\n💡 下一步操作:');
    console.log('   1. WebP文件已生成在原始PNG文件相同目录');
    console.log('   2. 代码仍使用PNG路径，但会加载WebP文件（如果存在）');
    console.log('   3. 运行 npm run dev 测试应用');
    console.log('   4. 如果WebP加载正常，可以考虑删除PNG备份文件');

    if (CONFIG.backupOriginal) {
        console.log('\n📁 备份文件:');
        console.log('   原始PNG文件已备份为 .png.backup 扩展名');
        console.log('   如需恢复，可以重命名备份文件');
    }
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

module.exports = { convertInPlace, processDirectory, ConcurrentQueue };