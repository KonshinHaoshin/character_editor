import React from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
// 使用更通用的图标或移除图标依赖
import { Smile, Frown, Meh, Laugh, Angry, Heart, Eye } from 'lucide-react'

interface PoseSelectorProps {
    compositions: Record<string, string[]>
    activeCompositions: Set<string>
    onToggleComposition: (name: string) => void
    loading?: boolean
}

const poseIcons: Record<string, React.ReactNode> = {
    'Normal': <Meh style={{ width: '16px', height: '16px' }} />,
    'Smile': <Smile style={{ width: '16px', height: '16px' }} />,
    'Angry': <Angry style={{ width: '16px', height: '16px' }} />,
    'Pensive': <Eye style={{ width: '16px', height: '16px' }} />,
    'Cry': <Frown style={{ width: '16px', height: '16px' }} />,
    'Flushed': <Heart style={{ width: '16px', height: '16px' }} />,
    'Surprised': <Eye style={{ width: '16px', height: '16px' }} />,
    'Fearful': <Eye style={{ width: '16px', height: '16px' }} />,
    'Default': <Meh style={{ width: '16px', height: '16px' }} />,
}

const getPoseIcon = (name: string): React.ReactNode => {
    const lowerName = name.toLowerCase()
    for (const [key, icon] of Object.entries(poseIcons)) {
        if (lowerName.includes(key.toLowerCase())) {
            return icon
        }
    }
    return <Meh className="h-4 w-4" />
}

const PoseSelector: React.FC<PoseSelectorProps> = ({
    compositions,
    activeCompositions,
    onToggleComposition,
    loading = false
}) => {
    const sortedCompositions = Object.keys(compositions).sort()

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Smile className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">姿势选择</h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            {activeCompositions.size} 个激活
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : sortedCompositions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            没有可用的姿势配置
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {sortedCompositions.map((name) => {
                                const isActive = activeCompositions.has(name)
                                return (
                                    <Button
                                        key={name}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => onToggleComposition(name)}
                                        className="justify-start gap-2 h-auto py-2"
                                    >
                                        {getPoseIcon(name)}
                                        <span className="truncate">{name}</span>
                                    </Button>
                                )
                            })}
                        </div>
                    )}

                    <div className="text-xs text-gray-500 pt-2 border-t">
                        点击姿势按钮切换激活状态，可同时激活多个姿势
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default PoseSelector
