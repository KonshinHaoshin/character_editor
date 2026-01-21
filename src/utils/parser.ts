import { ParsedLayerString, LayerInfo } from '../types'

export function parseLayerString(layerStr: string): ParsedLayerString {
  const opMatch = layerStr.match(/[+\->]/)
  if (!opMatch) {
    if (layerStr.endsWith('-')) {
      const group = layerStr.slice(0, -1)
      return { group, name: '', op: '-' }
    }
    return { group: '', name: '', op: '+' }
  }
  
  const op = opMatch[0] as '+' | '-' | '>'
  const opIndex = opMatch.index!
  const group = layerStr.substring(0, opIndex)
  const name = layerStr.substring(opIndex + 1)
  return { group, name, op }
}

export function applyLayerStrings(layerStrings: string[], states: Record<string, boolean>, layers: LayerInfo[]) {
  layerStrings.forEach(layerStr => {
    const { group, name, op } = parseLayerString(layerStr)
    if (!group) return

    if (op === '-' && !name) {
      layers.filter(l => l.group === group).forEach(l => {
        states[l.id] = false
      })
      return
    }
    
    const layerId = `${group}/${name}`
    
    if (op === '+') {
      states[layerId] = true
    } else if (op === '-') {
      states[layerId] = false
    } else if (op === '>') {
      layers.filter(l => l.group === group).forEach(l => {
        states[l.id] = (l.name === name)
      })
    }
  })
}

export function parseInfo(text: string, characterName: string): LayerInfo[] {
  return text.trim().split('\n').map(line => {
    const [group, name, order] = line.split(':')
    if (!group || !name || !order) return null

    // 使用原始PNG路径（WebP文件将在相同位置生成）
    const pngPath = `./${characterName}/${group}/${name}.png`

    return {
      group: group.trim(),
      name: name.trim(),
      order: parseInt(order, 10),
      path: pngPath, // 使用PNG路径，但实际加载WebP（如果存在）
      id: `${group.trim()}/${name.trim()}`
    }
  }).filter(Boolean).sort((a, b) => a!.order - b!.order) as LayerInfo[]
}

export function parseCompositions(text: string): Record<string, string[]> {
  const compositions: Record<string, string[]> = {}
  text.trim().split('\n').forEach(line => {
    const [name, partsStr] = line.split(':', 2)
    if (!name || !partsStr) return
    compositions[name.trim()] = partsStr.split(',').map(p => p.trim()).filter(Boolean)
  })
  return compositions
}

export function parseDefaultComposition(text: string): { presets: string[], layers: string[] } {
  const [part1, part2] = text.trim().split(':', 2)
  
  const part1LayerStrings: string[] = []
  const allPresetNames: string[] = []

  if (part1) {
    part1.split(',').map(p => p.trim()).forEach(item => {
      if (!item) return
      const parsed = parseLayerString(item)
      if (parsed.group) {
        part1LayerStrings.push(item)
      } else {
        allPresetNames.push(item)
      }
    })
  }

  const part2LayerStrings = part2 ? part2.split(',').map(p => p.trim()).filter(Boolean) : []
  
  return {
    layers: [...part2LayerStrings, ...part1LayerStrings],
    presets: allPresetNames
  }
}
