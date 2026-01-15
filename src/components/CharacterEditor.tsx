import React, { useState } from 'react'
import { useCharacterData } from '../hooks/useCharacterData'
import { useCharacterState } from '../hooks/useCharacterState'
import CharacterSelector from './CharacterSelector'
import PoseSelector from './PoseSelector'
import LayerControls from './LayerControls'
import CharacterCanvas from './CharacterCanvas'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Download, RotateCcw, Code, Palette } from 'lucide-react'

const CharacterEditor: React.FC = () => {
    const {
        characters,
        currentCharacter,
        setCurrentCharacter,
        characterData,
        loading,
        error
    } = useCharacterData()

    const {
        activeCompositions,
        currentStates,
        toggleComposition,
        toggleLayer,
        clearGroupOverrides,
        resetToDefault,
        setActiveCompositions,
        setManualOverrides
    } = useCharacterState(characterData)

    const [showExpression, setShowExpression] = useState(false)

    const handleExport = async () => {
        if (!characterData) return

        const activeLayers = characterData.layers.filter(layer => currentStates[layer.id])

        if (activeLayers.length === 0) {
            alert("没有可导出的内容。")
            return
        }

        try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
                throw new Error("无法获取Canvas上下文")
            }

            // 加载所有图片
            const loadedImages = await Promise.all(
                activeLayers.map(layer =>
                    new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.onload = () => resolve(img)
                        img.onerror = reject
                        img.src = layer.path
                    })
                )
            )

            // 计算最大尺寸
            let maxWidth = 0
            let maxHeight = 0
            loadedImages.forEach(img => {
                maxWidth = Math.max(maxWidth, img.naturalWidth)
                maxHeight = Math.max(maxHeight, img.naturalHeight)
            })

            canvas.width = maxWidth
            canvas.height = maxHeight

            // 按渲染顺序绘制
            activeLayers
                .sort((a, b) => a.order - b.order)
                .forEach((layer, index) => {
                    const img = loadedImages[index]
                    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
                })

            // 导出为PNG
            const link = document.createElement('a')
            link.download = `${currentCharacter}_export_${Date.now()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

        } catch (error) {
            console.error("导出失败:", error)
            alert("导出图片失败。请检查控制台获取更多信息。")
        }
    }

    const generateExpression = () => {
        if (!characterData) return ''

        const userPresetOrder = Array.from(activeCompositions)
        let expression = userPresetOrder.join(',')

        // 这里可以添加更复杂的表达式生成逻辑
        // 基于原始HTML中的generateOptimizedExpression函数

        return expression || 'Default'
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="text-red-500 text-4xl">⚠️</div>
                            <h3 className="text-xl font-semibold">加载失败</h3>
                            <p className="text-gray-600">{error}</p>
                            <Button onClick={() => setCurrentCharacter('Sherry')}>
                                重新加载默认角色
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 md:p-6">
            {/* 头部 */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">游戏立绘编辑器</h1>
                        <p className="text-gray-600 mt-2">
                            使用React 19 + Konva构建的专业立绘编辑工具
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Palette className="h-4 w-4" />
                            <span>当前角色: <span className="font-semibold text-primary">{currentCharacter}</span></span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧控制面板 */}
                <div className="lg:col-span-1 space-y-6">
                    <CharacterSelector
                        characters={characters}
                        currentCharacter={currentCharacter}
                        onCharacterChange={setCurrentCharacter}
                        loading={loading}
                    />

                    {characterData && (
                        <>
                            <PoseSelector
                                compositions={characterData.compositions}
                                activeCompositions={activeCompositions}
                                onToggleComposition={toggleComposition}
                                loading={loading}
                            />

                            <LayerControls
                                layers={characterData.layers}
                                layerStates={currentStates}
                                onToggleLayer={toggleLayer}
                                onClearGroup={clearGroupOverrides}
                                loading={loading}
                            />
                        </>
                    )}
                </div>

                {/* 中间画布区域 */}
                <div className="lg:col-span-2">
                    <div className="space-y-6">
                        {/* 画布 */}
                        <Card className="overflow-hidden">
                            <CardContent className="p-0">
                                {characterData ? (
                                    <CharacterCanvas
                                        layers={characterData.layers}
                                        layerStates={currentStates}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-[500px]">
                                        <div className="text-center">
                                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                                            <p className="mt-4 text-gray-600">加载角色数据中...</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 操作面板 */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            onClick={resetToDefault}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            一键重置
                                        </Button>

                                        <Button
                                            onClick={handleExport}
                                            className="gap-2 bg-green-600 hover:bg-green-700"
                                        >
                                            <Download className="h-4 w-4" />
                                            导出PNG
                                        </Button>

                                        <Button
                                            onClick={() => setShowExpression(!showExpression)}
                                            variant="outline"
                                            className="gap-2"
                                        >
                                            <Code className="h-4 w-4" />
                                            显示表达式
                                        </Button>
                                    </div>

                                    {showExpression && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">当前姿势表达式</span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigator.clipboard.writeText(generateExpression())}
                                                >
                                                    复制
                                                </Button>
                                            </div>
                                            <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                                                {generateExpression()}
                                            </pre>
                                        </div>
                                    )}

                                    {/* 状态信息 */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-primary">
                                                {characterData?.layers.length || 0}
                                            </div>
                                            <div className="text-xs text-gray-600">总图层数</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {Object.values(currentStates).filter(Boolean).length}
                                            </div>
                                            <div className="text-xs text-gray-600">激活图层</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {activeCompositions.size}
                                            </div>
                                            <div className="text-xs text-gray-600">激活姿势</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {Object.keys(characterData?.compositions || {}).length}
                                            </div>
                                            <div className="text-xs text-gray-600">可用姿势</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CharacterEditor
