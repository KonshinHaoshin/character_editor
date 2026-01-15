import React, { useState } from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { LayerInfo, LayerState } from '../types'
import { Layers, ChevronDown, ChevronRight, X } from 'lucide-react'

interface LayerControlsProps {
    layers: LayerInfo[]
    layerStates: LayerState
    onToggleLayer: (layerId: string) => void
    onClearGroup: (groupName: string) => void
    loading?: boolean
}

const LayerControls: React.FC<LayerControlsProps> = ({
    layers,
    layerStates,
    onToggleLayer,
    onClearGroup,
    loading = false
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

    // 按分组组织图层
    const groupedLayers = layers.reduce((acc, layer) => {
        if (!acc[layer.group]) {
            acc[layer.group] = []
        }
        acc[layer.group].push(layer)
        return acc
    }, {} as Record<string, LayerInfo[]>)

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev)
            if (newSet.has(groupName)) {
                newSet.delete(groupName)
            } else {
                newSet.add(groupName)
            }
            return newSet
        })
    }

    const getGroupIcon = (groupName: string) => {
        if (groupName.includes('Arm')) return '💪'
        if (groupName.includes('Facial')) return '😊'
        if (groupName.includes('Eye')) return '👁️'
        if (groupName.includes('Mouth')) return '👄'
        if (groupName.includes('Body')) return '👤'
        if (groupName.includes('Hair')) return '💇'
        if (groupName.includes('Effect')) return '✨'
        if (groupName.includes('Shadow')) return '🌑'
        if (groupName.includes('Clipping')) return '🎭'
        return '📁'
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">差分细节调整</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {Object.keys(groupedLayers).length} 个分组
                        </span>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                        {Object.entries(groupedLayers)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([groupName, groupLayers]) => {
                                const isExpanded = expandedGroups.has(groupName)
                                const activeCount = groupLayers.filter(l => layerStates[l.id]).length

                                return (
                                    <div key={groupName} className="border rounded-lg overflow-hidden">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                            <div
                                                className="flex items-center gap-2 flex-1"
                                                onClick={() => toggleGroup(groupName)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                                )}
                                                <span className="text-lg">{getGroupIcon(groupName)}</span>
                                                <span className="font-medium">{groupName}</span>
                                                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                                    {activeCount}/{groupLayers.length}
                                                </span>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onClearGroup(groupName)
                                                }}
                                                className="h-8 w-8 p-0"
                                                title="清空此分组"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-3 bg-white border-t">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {groupLayers
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map((layer) => {
                                                            const isActive = !!layerStates[layer.id]
                                                            return (
                                                                <Button
                                                                    key={layer.id}
                                                                    variant={isActive ? "default" : "outline"}
                                                                    size="sm"
                                                                    onClick={() => onToggleLayer(layer.id)}
                                                                    className="justify-start h-auto py-2 px-3"
                                                                >
                                                                    <span className="truncate">{layer.name}</span>
                                                                </Button>
                                                            )
                                                        })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t">
                        点击分组展开/折叠，点击图层按钮切换状态，点击×清空分组
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default LayerControls
