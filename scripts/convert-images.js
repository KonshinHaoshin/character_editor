const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// 配置
const CONFIG = {
    quality: 85, // WebP质量 (1-100)
    characters: [
        'Alisa', 'AnAn', 'Coco', 'Ema', 'Hanna', 'Hiro',
        'Leia', 'Margo', 'Meruru', 'Miria', 'Nanoka', 'Noah', 'Sherry'
    ],
    outputDir: 'public/optimized',
    skipExisting: true // 跳过已存在的WebP文件
};

// 转换单个PNG文件为WebP
async function convertPNGtoWebP(inputPath, outputPath, quality = CONFIG.quality) {
    try {
        // 检查输出文件是否已存在
        if (CONFIG.skipExisting) {
            try {
                await fs.access(outputPath);
                console.log(`⏭️  Skipping (already exists): ${path.basename(inputPath)}`);
                return null;
            } catch {
                // 文件不存在，继续转换
            }
        }

        const stats = await fs.stat(inputPath);

        // 使用sharp转换图片
        await sharp(inputPath)
            .webp({
                quality,
                lossless: false, // 使用有损压缩以获得更好的压缩率
                effort: 6 // 压缩努力级别 (0-6, 6最慢但压缩最好)
            })
            .toFile(outputPath);

        const webpStats = await fs.stat(outputPath);
        const reduction = ((stats.size - webpStats.size) / stats.size * 100).toFixed(1);

        console.log(`✓ ${path.basename(inputPath)}: ${(stats.size/1024).toFixed(1)}KB → ${(webpStats.size/1024).toFixed(1)}KB (${reduction}% smaller)`);

        return {
            original: stats.size,
            webp: webpStats.size,
            reduction: parseFloat(reduction),
            filename: path.basename(inputPath)
        };
    } catch (error) {
        console.error(`✗ Failed to convert ${inputPath}:`, error.message);
        return null;
    }
}

// 处理目录中的所有PNG文件
async function processDirectory(dirPath, outputBaseDir, quality = CONFIG.quality) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let stats = { original: 0, webp: 0, count: 0, files: [] };

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // 递归处理子目录
            const subStats = await processDirectory(fullPath, outputBaseDir, quality);
            stats.original += subStats.original;
            stats.webp += subStats.webp;
            stats.count += subStats.count;
            stats.files.push(...subStats.files);
        } else if (entry.name.toLowerCase().endsWith('.png')) {
            // 构建输出路径
            const relativePath = path.relative(process.cwd(), dirPath);
            const outputDir = path.join(outputBaseDir, relativePath);
            const outputPath = path.join(outputDir, entry.name.replace(/\.png$/i, '.webp'));

            // 确保输出目录存在
            await fs.mkdir(outputDir, { recursive: true });

            // 转换文件
            const result = await convertPNGtoWebP(fullPath, outputPath, quality);
            if (result) {
                stats.original += result.original;
                stats.webp += result.webp;
                stats.count++;
                stats.files.push(result);
            }
        }
    }

    return stats;
}

// 生成转换报告
function generateReport(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 图片转换报告');
    console.log('='.repeat(60));

    console.log(`\n📈 总体统计:`);
    console.log(`   转换文件数: ${stats.count}`);
    console.log(`   原始总大小: ${(stats.original / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   WebP总大小: ${(stats.webp / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   总体压缩率: ${((stats.original - stats.webp) / stats.original * 100).toFixed(1)}%`);
    console.log(`   节省空间: ${((stats.original - stats.webp) / 1024 / 1024).toFixed(2)} MB`);

    if (stats.files.length > 0) {
        // 找出压缩率最高和最低的文件
        const sortedByReduction = [...stats.files].sort((a, b) => b.reduction - a.reduction);

        console.log(`\n🏆 压缩效果最佳 (前5名):`);
        sortedByReduction.slice(0, 5).forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% 压缩率`);
        });

        console.log(`\n📉 压缩效果最差 (后5名):`);
        sortedByReduction.slice(-5).reverse().forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.filename}: ${file.reduction}% 压缩率`);
        });
    }

    console.log('\n' + '='.repeat(60));
}

// 主函数
async function main() {
    console.log('🚀 开始PNG到WebP图片转换...\n');
    console.log(`配置:`);
    console.log(`  质量: ${CONFIG.quality}`);
    console.log(`  输出目录: ${CONFIG.outputDir}`);
    console.log(`  跳过已存在文件: ${CONFIG.skipExisting ? '是' : '否'}`);
    console.log(`  角色数量: ${CONFIG.characters.length}\n`);

    const startTime = Date.now();
    let grandTotal = { original: 0, webp: 0, count: 0, files: [] };

    // 处理每个角色
    for (const character of CONFIG.characters) {
        console.log(`\n📁 处理角色: ${character}...`);
        const characterDir = path.join(process.cwd(), character);

        try {
            await fs.access(characterDir);
            const stats = await processDirectory(characterDir, CONFIG.outputDir, CONFIG.quality);
            grandTotal.original += stats.original;
            grandTotal.webp += stats.webp;
            grandTotal.count += stats.count;
            grandTotal.files.push(...stats.files);

            console.log(`   ${character}: 转换了 ${stats.count} 张图片`);
        } catch (error) {
            console.log(`   ${character}: 目录不存在，跳过`);
        }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    // 生成报告
    generateReport(grandTotal);

    console.log(`\n⏱️  总耗时: ${duration} 秒`);
    console.log(`🎉 转换完成！WebP图片已保存到: ${CONFIG.outputDir}`);

    // 提示下一步操作
    console.log('\n💡 下一步:');
    console.log('   1. 运行 npm run build 构建项目');
    console.log('   2. 检查 public/optimized 目录中的WebP文件');
    console.log('   3. 测试应用以确保图片正常加载');
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

module.exports = { convertPNGtoWebP, processDirectory };