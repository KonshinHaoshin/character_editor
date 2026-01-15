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

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px',
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
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        alignItems: 'start'
    }

    const leftPanelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    }

    const rightPanelStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    }

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
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
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        backgroundColor: 'white',
        marginBottom: '12px'
    }

    const buttonStyle = (variant: 'primary' | 'secondary' | 'outline' = 'primary'): React.CSSProperties => {
        const base: React.CSSProperties = {
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
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
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
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

                    {/* 操作按钮 */}
                    <div style={cardStyle}>
                        <h3 style={cardTitleStyle}>
                            <span>⚙️</span>
                            操作
                        </h3>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <Button onClick={resetToDefault} variant="outline">
                                🔄 一键重置
                            </Button>
                            <Button onClick={() => {
                                // 导出功能占位
                                alert('导出功能将在完整版本中实现')
                            }} variant="secondary">
                                💾 导出PNG
                            </Button>
                        </div>
                    </div>
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
