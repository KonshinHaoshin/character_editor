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

  // 计算画布尺寸
  useEffect(() => {
    if (loadedImages.length === 0) return

    let maxWidth = 0
    let maxHeight = 0

    loadedImages.forEach(({ image }) => {
      maxWidth = Math.max(maxWidth, image.naturalWidth)
      maxHeight = Math.max(maxHeight, image.naturalHeight)
    })

    if (maxWidth > 0 && maxHeight > 0) {
      setCanvasSize({ 
        width: Math.min(maxWidth, 800), // 限制最大宽度
        height: Math.min(maxHeight, 1200) // 限制最大高度
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
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid #d1d5db',
      minHeight: '500px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
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
            overflow: 'hidden'
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
          
          {/* 画布信息 */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '12px',
            backdropFilter: 'blur(4px)'
          }}>
            {canvasSize.width} × {canvasSize.height}px
          </div>
          
          {/* 图层计数 */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '12px',
            backdropFilter: 'blur(4px)'
          }}>
            {sortedImages.length} 个图层
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