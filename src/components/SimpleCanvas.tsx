import React, { useState, useEffect } from 'react'
import { LayerInfo, LayerState } from '../types'

interface SimpleCanvasProps {
  layers: LayerInfo[]
  layerStates: LayerState
}

const SimpleCanvas: React.FC<SimpleCanvasProps> = ({ layers, layerStates }) => {
  const [loadedImages, setLoadedImages] = useState<Array<{ layer: LayerInfo; image: HTMLImageElement }>>([])
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 1000 })

  // 预加载所有激活的图片
  useEffect(() => {
    const activeLayers = layers.filter(layer => layerStates[layer.id])
    
    const loadPromises = activeLayers.map(async (layer) => {
      try {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        
        return new Promise<{ layer: LayerInfo; image: HTMLImageElement }>((resolve) => {
          img.onload = () => resolve({ layer, image: img })
          img.onerror = () => {
            console.warn(`Failed to load image: ${layer.path}`)
            // 创建一个占位图片
            const placeholder = new Image()
            placeholder.src = `data:image/svg+xml,${encodeURIComponent(`
              <svg width="500" height="1000" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="20">
                  ${layer.name}
                </text>
              </svg>
            `)}`
            placeholder.onload = () => resolve({ layer, image: placeholder })
          }
          img.src = layer.path
        })
      } catch (error) {
        console.warn(`Error loading image: ${layer.path}`, error)
        // 返回一个占位图片
        const placeholder = new Image()
        placeholder.src = `data:image/svg+xml,${encodeURIComponent(`
          <svg width="500" height="1000" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="50%" y="50%" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="20">
              Error
            </text>
          </svg>
        `)}`
        return { layer, image: placeholder }
      }
    })

    Promise.all(loadPromises).then(loaded => {
      setLoadedImages(loaded)
    })
  }, [layers, layerStates])

  // 计算画布尺寸 - 参考character_editor.html的样式
  useEffect(() => {
    if (loadedImages.length === 0) return

    let maxWidth = 0
    let maxHeight = 0

    loadedImages.forEach(({ image }) => {
      maxWidth = Math.max(maxWidth, image.naturalWidth)
      maxHeight = Math.max(maxHeight, image.naturalHeight)
    })

    if (maxWidth > 0 && maxHeight > 0) {
      // 参考character_editor.html：max-width: 500px, aspect-ratio: 1/2
      const targetMaxWidth = 600 // 比原版稍大
      const targetMaxHeight = 1200 // 1:2宽高比

      // 保持宽高比，但优先保证高度
      const widthRatio = targetMaxWidth / maxWidth
      const heightRatio = targetMaxHeight / maxHeight

      // 选择较小的比例以确保图片完全显示
      const ratio = Math.min(widthRatio, heightRatio, 1)

      setCanvasSize({ 
        width: Math.floor(maxWidth * ratio),
        height: Math.floor(maxHeight * ratio)
      })
    }
  }, [loadedImages])

  // 按渲染顺序排序
  const sortedImages = loadedImages.sort((a, b) => a.layer.order - b.layer.order)

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #d1d5db',
      minHeight: '600px', // 更高
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s ease',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    }}>
      {sortedImages.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280',
          padding: '40px'
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
          <p>加载立绘中...</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>请选择姿势或调整差分</p>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{
            position: 'relative',
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
            margin: '0 auto',
              overflow: 'hidden',
              maxWidth: '100%',
              maxHeight: '100%'
          }}>
            {sortedImages.map(({ layer, image }) => (
              <img
                key={layer.id}
                src={image.src}
                alt={layer.name}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  pointerEvents: 'none'
                }}
              />
            ))}
          </div>
          
            {/* 画布信息和图层计数合并显示 */}
          <div style={{
            position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '10px',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
          }}>
              <span>{canvasSize.width} × {canvasSize.height}px</span>
              <span style={{ opacity: 0.7 }}>|</span>
              <span>{sortedImages.length} layers</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default SimpleCanvas