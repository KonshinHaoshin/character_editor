import React from 'react'
import { Select } from './ui/select'
import { Card, CardContent } from './ui/card'
import { Users } from 'lucide-react'

interface CharacterSelectorProps {
    characters: string[]
    currentCharacter: string
    onCharacterChange: (character: string) => void
    loading?: boolean
}

const CharacterSelector: React.FC<CharacterSelectorProps> = ({
    characters,
    currentCharacter,
    onCharacterChange,
    loading = false
}) => {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">角色选择</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            选择要编辑的角色
                        </label>
                        <Select
                            value={currentCharacter}
                            onChange={(e) => onCharacterChange(e.target.value)}
                            disabled={loading}
                            className="w-full"
                        >
                            {characters.map((character) => (
                                <option key={character} value={character}>
                                    {character}
                                </option>
                            ))}
                        </Select>
                    </div>

                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            加载角色数据中...
                        </div>
                    )}

                    <div className="text-xs text-gray-500">
                        当前选择: <span className="font-medium text-primary">{currentCharacter}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default CharacterSelector
