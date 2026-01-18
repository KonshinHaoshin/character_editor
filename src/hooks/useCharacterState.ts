import { useState, useCallback, useMemo } from 'react'
import { CharacterData, LayerState } from '../types'
import { applyLayerStrings, parseLayerString } from '../utils/parser'

export function useCharacterState(characterData: CharacterData | null) {
  const [activeCompositions, setActiveCompositions] = useState<Set<string>>(new Set())
  const [manualOverrides, setManualOverrides] = useState<LayerState>({})

  const calculateLayerStates = useCallback((): LayerState => {
    if (!characterData) return {}
    
    const states: LayerState = {}
    
    // 1. 应用默认的详细差分状态
    applyLayerStrings(characterData.defaultComposition.layers, states, characterData.layers)
    
    // 2. 应用所有当前激活的姿势
    const applyCompositionRecursive = (compNames: string[], targetStates: LayerState) => {
      compNames.forEach(compName => {
        const parts = characterData.compositions[compName]
        if (!parts) return

        parts.forEach(part => {
          if (characterData.compositions[part]) {
            applyCompositionRecursive([part], targetStates)
          } else {
            applyLayerStrings([part], targetStates, characterData.layers)
          }
        })
      })
    }
    
    applyCompositionRecursive(Array.from(activeCompositions), states)
    
    // 3. 应用用户手动覆盖
    Object.assign(states, manualOverrides)
    
    return states
  }, [characterData, activeCompositions, manualOverrides])

  const currentStates = useMemo(() => calculateLayerStates(), [calculateLayerStates])

  const toggleComposition = useCallback((name: string) => {
    setActiveCompositions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(name)) {
        newSet.delete(name)
      } else {
        newSet.add(name)
      }
      return newSet
    })
  }, [])

  const toggleLayer = useCallback((layerId: string) => {
    setManualOverrides(prev => ({
      ...prev,
      [layerId]: !currentStates[layerId]
    }))
  }, [currentStates])

  const clearGroupOverrides = useCallback((groupName: string) => {
    if (!characterData) return
    
    const newOverrides = { ...manualOverrides }
    characterData.layers
      .filter(l => l.group === groupName)
      .forEach(layer => {
        newOverrides[layer.id] = false
      })
    
    setManualOverrides(newOverrides)
  }, [characterData, manualOverrides])

  const resetToDefault = useCallback(() => {
    if (!characterData) return
    
    setActiveCompositions(new Set(characterData.defaultComposition.presets))
    setManualOverrides({})
  }, [characterData])

  const applyExpression = useCallback((expression: string) => {
    if (!characterData) return

    const parts = expression.split(',').map(p => p.trim()).filter(Boolean)
    const newActiveCompositions = new Set<string>()
    const newManualOverrides: LayerState = {}

    // 首先计算基础状态，以便处理 + 和 - 这种增量式的手动覆盖
    const baseStates: LayerState = {}
    applyLayerStrings(characterData.defaultComposition.layers, baseStates, characterData.layers)

    parts.forEach(part => {
      if (characterData.compositions[part]) {
        // 如果是预设
        newActiveCompositions.add(part)
      } else {
        // 如果是手动图层控制
        const { group, name, op } = parseLayerString(part)
        if (!group) return

        if (op === '-' && !name) {
          // 清空组: Group-
          characterData.layers.filter(l => l.group === group).forEach(l => {
            newManualOverrides[l.id] = false
          })
        } else if (op === '>') {
          // 切换组内图层: Group>Name
          characterData.layers.filter(l => l.group === group).forEach(l => {
            newManualOverrides[l.id] = (l.name === name)
          })
        } else if (op === '+') {
          // 开启图层: Group+Name
          const layerId = `${group}/${name}`
          newManualOverrides[layerId] = true
        } else if (op === '-') {
          // 关闭图层: Group-Name
          const layerId = `${group}/${name}`
          newManualOverrides[layerId] = false
        }
      }
    })

    setActiveCompositions(newActiveCompositions)
    setManualOverrides(newManualOverrides)
  }, [characterData])

  const getAffectedGroupsFromComposition = useCallback((compName: string): Set<string> => {
    if (!characterData) return new Set()
    
    const affectedGroups = new Set<string>()
    const stack = [compName]
    const visited = new Set<string>()

    while (stack.length > 0) {
      const currentComp = stack.pop()!
      if (visited.has(currentComp)) continue
      visited.add(currentComp)

      const parts = characterData.compositions[currentComp]
      if (!parts) continue

      parts.forEach(part => {
        if (characterData.compositions[part]) {
          stack.push(part)
        } else {
          const groupMatch = part.match(/^([^+\->]+)/)
          if (groupMatch) {
            affectedGroups.add(groupMatch[1])
          }
        }
      })
    }
    return affectedGroups
  }, [characterData])

  return {
    activeCompositions,
    manualOverrides,
    currentStates,
    toggleComposition,
    toggleLayer,
    clearGroupOverrides,
    resetToDefault,
    getAffectedGroupsFromComposition,
    setActiveCompositions,
    setManualOverrides,
    applyExpression
  }
}
