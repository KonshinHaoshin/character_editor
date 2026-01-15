import { useState, useCallback, useMemo } from 'react'
import { CharacterData, LayerState } from '../types'
import { applyLayerStrings } from '../utils/parser'

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
    setManualOverrides
  }
}
