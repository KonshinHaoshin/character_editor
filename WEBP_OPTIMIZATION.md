# WebP专用图片优化方案

## 概述

这个方案专门为WebP格式优化，将所有PNG图片转换为WebP格式，显著减少图片体积，提升加载性能。

## 主要特性

- 🚀 **专为WebP设计**：完全专注于WebP格式，不保留PNG回退
- 📊 **智能质量调整**：根据图片类型（身体、面部、特效）使用不同的质量设置
- ⚡ **并发处理**：支持并发转换，提高处理速度
- 📈 **详细报告**：生成详细的转换统计报告
- 🎯 **目录结构保持**：保持原有的目录结构

## 安装依赖

```bash
npm install
```

## 使用方法

### 1. 转换所有PNG图片为WebP

```bash
npm run webp-optimize
```

这个命令会：
- 扫描所有角色目录中的PNG图片
- 根据图片类型智能选择质量设置
- 将转换后的WebP图片保存到 `public/webp-optimized` 目录
- 生成详细的转换报告

### 2. 构建使用WebP的版本

```bash
npm run build:webp
```

这个命令会先转换图片，然后构建项目。

### 3. 清理WebP文件

```bash
npm run clean-webp
```

### 4. 开发模式

```bash
npm run dev
```

## 质量设置

系统根据图片类型自动选择质量：

| 图片类型 | 质量 | 说明 |
|---------|------|------|
| 身体图片 | 90 | 需要最高质量 |
| 面部表情 | 85 | 中等质量，保持细节 |
| 特效图片 | 80 | 可以接受较低质量 |
| 其他图片 | 85 | 默认质量 |

## 目录结构

转换后的WebP图片会保持原有的目录结构：

```
原始结构：
character_editor/
├── Sherry/
│   └── Angle01/
│       ├── Body.png
│       └── Facial/
│           └── Eyes_Normal_Open01.png

转换后结构：
character_editor/
└── public/
    └── webp-optimized/
        └── Sherry/
            └── Angle01/
                ├── Body.webp
                └── Facial/
                    └── Eyes_Normal_Open01.webp
```

## 代码修改

### 1. 图片路径解析 (`src/utils/parser.ts`)

修改了 `parseInfo` 函数，直接使用WebP路径：

```typescript
// 专为WebP - 直接使用WebP路径
const webpPath = `./webp-optimized/${characterName}/${group}/${name}.webp`
```

### 2. 图片加载 (`src/components/SimpleCanvas.tsx`)

移除了PNG回退逻辑，只加载WebP图片。

### 3. 类型定义 (`src/types/index.ts`)

简化了 `LayerInfo` 接口，只包含必要的字段。

## 性能优势

1. **体积减少**：WebP通常比PNG小25-35%
2. **加载速度**：更小的文件意味着更快的下载
3. **带宽节省**：对用户和服务器都有好处
4. **现代格式**：WebP是现代的图片格式，支持透明度和动画

## 浏览器支持

WebP得到所有现代浏览器的支持：
- Chrome 17+ (2012)
- Firefox 65+ (2019)
- Safari 14+ (2020)
- Edge 18+ (2018)

## 注意事项

1. **首次转换**：首次运行 `npm run webp-optimize` 可能需要一些时间，具体取决于图片数量
2. **磁盘空间**：转换后的WebP图片会占用额外的磁盘空间，但通常比PNG小
3. **构建流程**：建议在构建生产版本时使用 `npm run build:webp`

## 故障排除

### 问题：WebP图片无法加载
**解决方案**：
1. 确保已运行 `npm run webp-optimize`
2. 检查 `public/webp-optimized` 目录是否存在WebP文件
3. 检查浏览器控制台是否有错误信息

### 问题：转换速度慢
**解决方案**：
1. 减少并发数量（修改 `scripts/webp-optimizer.js` 中的 `concurrentLimit`）
2. 对于大图片，可以降低质量设置

### 问题：图片质量不满意
**解决方案**：
1. 修改 `scripts/webp-optimizer.js` 中的质量设置
2. 重新运行转换命令

## 下一步

1. ✅ 实现WebP专用转换脚本
2. ✅ 修改代码以使用WebP路径
3. ✅ 更新构建脚本
4. 🔄 测试所有功能
5. 🔄 性能监控和优化

## 相关命令

| 命令 | 说明 |
|------|------|
| `npm run webp-optimize` | 转换PNG为WebP |
| `npm run build:webp` | 构建使用WebP的版本 |
| `npm run clean-webp` | 清理WebP文件 |
| `npm run optimize-images` | 旧版转换脚本（带PNG回退） |
| `npm run clean-optimized` | 清理旧版优化文件 |

## 版本历史

- **v1.0.0** (2026-01-21): 初始版本，专为WebP优化
