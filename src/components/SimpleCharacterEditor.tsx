import React, { useState, useEffect } from 'react'
import { useCharacterData } from '../hooks/useCharacterData'
import { useCharacterState } from '../hooks/useCharacterState'
import SimpleCanvas from './SimpleCanvas'

const SimpleCharacterEditor: React.FC = () => {
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
        resetToDefault
    } = useCharacterState(characterData)

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    const exportImage = async (format: 'png' | 'webp') => {
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

            // 导出为指定格式
            const mimeType = format === 'webp' ? 'image/webp' : 'image/png'
            const quality = format === 'webp' ? 0.8 : 1.0 // WebP使用压缩

            const link = document.createElement('a')
            link.download = `${currentCharacter}_export_${Date.now()}.${format}`
            link.href = canvas.toDataURL(mimeType, quality)
            link.click()

        } catch (error) {
            console.error("导出失败:", error)
            alert("导出图片失败。请检查控制台获取更多信息。")
        }
    }

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px 30px', // 平衡左右内边距
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }

    const headerStyle: React.CSSProperties = {
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e5e7eb'
    }

    const titleStyle: React.CSSProperties = {
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '8px'
    }

    const subtitleStyle: React.CSSProperties = {
        fontSize: '16px',
        color: '#6b7280'
    }

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1.5fr 1.5fr', // 让左右更平衡，右侧有更多空间
        gap: '40px',
        alignItems: 'start'
    }

    const leftPanelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
         gap: '28px'
     }

    const rightPanelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    }

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #e5e7eb'
    }

    const cardTitleStyle: React.CSSProperties = {
        fontSize: '18px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    }

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '15px',
        backgroundColor: 'white',
        marginBottom: '16px',
        cursor: 'pointer'
    }

    const buttonStyle = (variant: 'primary' | 'secondary' | 'outline' = 'primary'): React.CSSProperties => {
        const base: React.CSSProperties = {
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            minHeight: '40px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        }

        switch (variant) {
            case 'primary':
                return {
                    ...base,
                    backgroundColor: '#3b82f6',
                    color: 'white'
                }
            case 'secondary':
                return {
                    ...base,
                    backgroundColor: '#10b981',
                    color: 'white'
                }
            case 'outline':
                return {
                    ...base,
                    backgroundColor: 'transparent',
                    color: '#374151',
                    border: '1px solid #d1d5db'
                }
            default:
                return base
        }
    }

    const buttonHoverStyle = (variant: 'primary' | 'secondary' | 'outline' = 'primary'): React.CSSProperties => {
        switch (variant) {
            case 'primary':
                return { backgroundColor: '#2563eb' }
            case 'secondary':
                return { backgroundColor: '#059669' }
            case 'outline':
                return { backgroundColor: '#f3f4f6' }
            default:
                return {}
        }
    }

    const activeButtonStyle = (variant: 'primary' | 'secondary' | 'outline' = 'primary'): React.CSSProperties => {
        switch (variant) {
            case 'primary':
                return { backgroundColor: '#1d4ed8' }
            case 'secondary':
                return { backgroundColor: '#047857' }
            case 'outline':
                return { backgroundColor: '#e5e7eb' }
            default:
                return {}
        }
    }

    const Button: React.FC<{
        children: React.ReactNode
        onClick?: () => void
        variant?: 'primary' | 'secondary' | 'outline'
        active?: boolean
        style?: React.CSSProperties
    }> = ({ children, onClick, variant = 'primary', active = false, style }) => {
        const [hover, setHover] = useState(false)

        return (
            <button
                onClick={onClick}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={{
                    ...buttonStyle(variant),
                    ...(hover ? buttonHoverStyle(variant) : {}),
                    ...(active ? activeButtonStyle(variant) : {}),
                    ...style
                }}
            >
                {children}
            </button>
        )
    }

    if (error) {
        return (
            <div style={containerStyle}>
                <div style={{
                    ...cardStyle,
                    maxWidth: '500px',
                    margin: '100px auto',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>加载失败</h3>
                    <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
                    <Button onClick={() => setCurrentCharacter('Sherry')}>
                        重新加载默认角色
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div style={containerStyle}>
            {/* 头部 */}
            <header style={headerStyle}>
                <h1 style={titleStyle}>游戏立绘编辑器</h1>
            </header>

            <div style={gridStyle}>
                {/* 左侧控制面板 */}
                <div style={leftPanelStyle}>
                    {/* 角色选择 */}
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>
                            <span>👤</span>
                            角色选择
                        </h3>
                        <select
                            style={selectStyle}
                            value={currentCharacter}
                            onChange={(e) => setCurrentCharacter(e.target.value)}
                            disabled={loading}
                        >
                            {characters.map((character) => (
                                <option key={character} value={character}>
                                    {character}
                                </option>
                            ))}
                        </select>
                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid #e5e7eb',
                                    borderTopColor: '#3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                加载角色数据中...
                            </div>
                        )}
                    </div>

                    {/* 姿势选择 */}
                    {characterData && (
                        <div style={cardStyle}>
                            <h3 style={cardTitleStyle}>
                                <span>😊</span>
                                姿势选择
                                <span style={{
                                    fontSize: '12px',
                                    backgroundColor: '#dbeafe',
                                    color: '#1e40af',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    marginLeft: '8px'
                                }}>
                                    {activeCompositions.size} 个激活
                                </span>
                            </h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: '8px'
                            }}>
                                {Object.keys(characterData.compositions)
                                    .sort()
                                    .map((name) => {
                                        const isActive = activeCompositions.has(name)
                                        return (
                                            <Button
                                                key={name}
                                                onClick={() => toggleComposition(name)}
                                                variant={isActive ? 'primary' : 'outline'}
                                                active={isActive}
                                                style={{ justifyContent: 'center' }}
                                            >
                                                {name}
                                            </Button>
                                        )
                                    })}
                            </div>
                        </div>
                    )}

                </div>

                {/* 右侧画布区域 */}
                <div style={rightPanelStyle}>
                    {/* 画布区域 */}
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>
                            <span>🎨</span>
                            立绘预览
                        </h3>
                        {characterData ? (
                            <SimpleCanvas
                                layers={characterData.layers}
                                layerStates={currentStates}
                            />
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '500px',
                                color: '#6b7280'
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    border: '3px solid #e5e7eb',
                                    borderTopColor: '#3b82f6',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    marginBottom: '16px'
                                }} />
                                <p>加载角色数据中...</p>
                            </div>
                        )}
                    </div>

                    {/* 操作按钮 - 放在画布下面 */}
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>
                            <span>⚙️</span>
                            操作
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <Button onClick={resetToDefault} variant="outline" style={{ flex: 1 }}>
                                    🔄 一键重置
                                </Button>
                            </div>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: '16px'
                            }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>导出格式</div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        onClick={() => exportImage('png')}
                                        variant="secondary"
                                        style={{ flex: 1 }}
                                    >
                                        💾 PNG
                                    </Button>
                                    <Button
                                        onClick={() => exportImage('webp')}
                                        variant="secondary"
                                        style={{ flex: 1 }}
                                    >
                                        🖼️ WebP
                                    </Button>
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
                                    <div>• PNG: 无损质量，兼容性好</div>
                                    <div>• WebP: 体积更小，适合网页使用</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 底部信息 */}
            <footer style={{
                marginTop: '40px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px'
            }}>
                <p style={{ marginTop: '4px' }}>支持 {characters.length} 个角色，点击角色名称切换编辑</p>
            </footer>

            {/* 动画样式 */}
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        button:hover {
          transform: translateY(-1px);
        }
        
        select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
        </div>
    )
}

export default SimpleCharacterEditor
