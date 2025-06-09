'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchAddon } from '@xterm/addon-search'
import { X, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TerminalSearchProps {
    searchAddon?: SearchAddon | null
    onClose: () => void
    className?: string
}

export function TerminalSearch({ searchAddon, onClose, className }: TerminalSearchProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [caseSensitive, setCaseSensitive] = useState(false)
    const [wholeWord, setWholeWord] = useState(false)
    const [regex, setRegex] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        // Focus the input when the component mounts
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [])

    const handleSearch = (direction: 'next' | 'previous') => {
        if (!searchAddon || !searchTerm) return

        const options = {
            caseSensitive,
            wholeWord,
            regex,
        }

        if (direction === 'next') {
            searchAddon.findNext(searchTerm, options)
        } else {
            searchAddon.findPrevious(searchTerm, options)
        }
    }

    // Handle keyboard shortcuts
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) {
                handleSearch('previous')
            } else {
                handleSearch('next')
            }
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
        }
    }

    return (
        <div
            className={cn(
                'flex flex-col gap-2 absolute right-2 top-2 z-50 bg-background border rounded-md shadow-md p-2 w-64',
                className
            )}
        >
            <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        ref={inputRef}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search..."
                        className="pl-8"
                    />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSearch('previous')}
                        disabled={!searchTerm}
                        className="h-8 px-2"
                    >
                        <ArrowUp className="h-4 w-4 mr-1" />
                        Prev
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSearch('next')}
                        disabled={!searchTerm}
                        className="h-8 px-2"
                    >
                        <ArrowDown className="h-4 w-4 mr-1" />
                        Next
                    </Button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={caseSensitive}
                            onChange={() => setCaseSensitive(!caseSensitive)}
                            className="mr-1 h-3 w-3"
                        />
                        Aa
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={wholeWord}
                            onChange={() => setWholeWord(!wholeWord)}
                            className="mr-1 h-3 w-3"
                        />
                        Word
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={regex}
                            onChange={() => setRegex(!regex)}
                            className="mr-1 h-3 w-3"
                        />
                        .*
                    </label>
                </div>
            </div>
        </div>
    )
} 