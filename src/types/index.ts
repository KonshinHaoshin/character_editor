export interface LayerInfo {
  group: string
  name: string
  order: number
  path: string
  id: string
}

export interface Composition {
  [name: string]: string[]
}

export interface DefaultComposition {
  presets: string[]
  layers: string[]
}

export interface CharacterData {
  name: string
  layers: LayerInfo[]
  compositions: Composition
  defaultComposition: DefaultComposition
}

export interface LayerState {
  [layerId: string]: boolean
}

export interface CharacterState {
  activeCompositions: Set<string>
  manualOverrides: LayerState
  currentStates: LayerState
}

export interface ParsedLayerString {
  group: string
  name: string
  op: '+' | '-' | '>'
}
