const fs = require('fs').promises;
const path = require('path');

// 配置
const CONFIG = {
  characters: [
    'Alisa', 'AnAn', 'Coco', 'Ema', 'Hanna', 'Hiro', 
    'Leia', 'Margo', 'Meruru', 'Miria', 'Nanoka', 'Noah', 'Sherry'
  ]
};

// 检查目录中的文件
async function checkDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let stats = {
    pngCount: 0,
    webpCount: 0,
    totalFiles: 0,
    missingWebP: []
  };
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      const subStats = await checkDirectory(fullPath);
      stats.pngCount += subStats.pngCount;
      stats.webpCount += subStats.webpCount;
      stats.totalFiles += subStats.totalFiles;
      stats.missingWebP.push(...subStats.missingWebP);
    } else {
      stats.totalFiles++;
      if (entry.name.toLowerCase().endsWith('.png')) {
        stats.pngCount++;
        
        // 检查对应的WebP文件是否存在
        const webpPath = fullPath.replace(/\.png$/i, '.webp');
        try {
          await fs.access(webpPath);
          stats.webpCount++;
        } catch {
          stats.missingWebP.push(fullPath);
        }
      } else if (entry.name.toLowerCase().endsWith('.webp')) {
        stats.webpCount++;
      }
    }
  }
  
  return stats;
}

// 生成报告
function generateReport(stats) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 WebP转换验证报告');
  console.log('='.repeat(70));
  
  console.log(`\n📊 文件统计:`);
  console.log(`   总文件数: ${stats.totalFiles}`);
  console.log(`   PNG文件数: ${stats.pngCount}`);
  console.log(`   WebP文件数: ${stats.webpCount}`);
  
  if (stats.pngCount > 0) {
    const conversionRate = (stats.webpCount / stats.pngCount * 100).toFixed(1);
    console.log(`   转换率: ${conversionRate}%`);
  }
  
  if (stats.missingWebP.length > 0) {
    console.log(`\n⚠️  缺少WebP的文件 (${stats.missingWebP.length} 个):`);
    stats.missingWebP.slice(0, 10).forEach((file, index) => {
      console.log(`   ${index + 1}. ${path.relative(process.cwd(), file)}`);
    });
    
    if (stats.missingWebP.length > 10) {
      console.log(`   ... 还有 ${stats.missingWebP.length - 10} 个文件`);
    }
  } else {
    console.log(`\n✅ 所有PNG文件都已成功转换为WebP！`);
  }
  
  console.log('\n' + '='.repeat(70));
}

// 主函数
async function main() {
  console.log('🔍 开始验证WebP转换状态...\n');
  
  let grandTotal = {
    pngCount: 0,
    webpCount: 0,
    totalFiles: 0,
    missingWebP: []
  };
  
  // 检查每个角色
  for (const character of CONFIG.characters) {
    console.log(`📁 检查角色: ${character}...`);
    const characterDir = path.join(process.cwd(), character);
    
    try {
      await fs.access(characterDir);
      const stats = await checkDirectory(characterDir);
      
      grandTotal.pngCount += stats.pngCount;
      grandTotal.webpCount += stats.webpCount;
      grandTotal.totalFiles += stats.totalFiles;
      grandTotal.missingWebP.push(...stats.missingWebP);
      
      console.log(`   ${character}: ${stats.pngCount} PNG, ${stats.webpCount} WebP`);
    } catch (error) {
      console.log(`   ${character}: 目录不存在，跳过`);
    }
  }
  
  // 生成总体报告
  generateReport(grandTotal);
  
  // 建议
  console.log('\n💡 建议:');
  if (grandTotal.missingWebP.length > 0) {
    console.log('   1. 运行 npm run webp-inplace 转换缺失的PNG文件');
    console.log('   2. 确保所有PNG文件都已转换为WebP');
  } else {
    console.log('   1. ✅ 所有图片都已转换为WebP格式');
    console.log('   2. ✅ 可以安全删除所有PNG文件（如果还有的话）');
    console.log('   3. ✅ 应用现在完全使用WebP格式');
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 验证过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = { checkDirectory };
