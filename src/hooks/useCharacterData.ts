import { useState, useEffect, useCallback } from 'react'
import { CharacterData } from '../types'
import { parseInfo, parseCompositions, parseDefaultComposition } from '../utils/parser'

const CHARACTERS = ['Alisa', 'AnAn', 'Coco', 'Ema', 'Hanna', 'Hiro', 'Leia', 'Margo', 'Meruru', 'Miria', 'Nanoka', 'Noah', 'Sherry']

export function useCharacterData() {
  const [characters] = useState<string[]>(CHARACTERS)
  const [currentCharacter, setCurrentCharacter] = useState<string>('Sherry')
  const [characterData, setCharacterData] = useState<CharacterData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCharacter = useCallback(async (name: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const [infoText, compText, defaultCompText] = await Promise.all([
        fetch(`./${name}/info.txt`).then(res => res.text()),
        fetch(`./${name}/composition.txt`).then(res => res.text()),
        fetch(`./${name}/default_composition.txt`).then(res => res.text())
      ])

      const layers = parseInfo(infoText, name)
      const compositions = parseCompositions(compText)
      const defaultComposition = parseDefaultComposition(defaultCompText)

      setCharacterData({
        name,
        layers,
        compositions,
        defaultComposition
      })
    } catch (err) {
      console.error(`加载角色 ${name} 数据失败:`, err)
      setError(`加载角色'${name}'失败，请检查文件是否存在以及Web服务器是否正常运行。`)
      setCharacterData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCharacter(currentCharacter)
  }, [currentCharacter, loadCharacter])

  return {
    characters,
    currentCharacter,
    setCurrentCharacter,
    characterData,
    loading,
    error,
    loadCharacter
  }
}
