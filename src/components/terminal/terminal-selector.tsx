'use client'

import { useEffect, useState } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Check, ChevronsUpDown, Terminal as TerminalIcon, TerminalSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TerminalType, useIDEStore } from '@/store/ide-store'

interface TerminalSelectorProps {
    className?: string;
    terminalId?: string; // Belirli terminal ID'si için (opsiyonel)
}

const terminalOptions = [
    {
        value: 'cmd',
        label: 'Command Prompt',
        icon: <TerminalIcon className="h-4 w-4 mr-2" />,
        description: 'Windows Command Prompt (CMD)'
    },
    {
        value: 'powershell',
        label: 'PowerShell',
        icon: <TerminalIcon className="h-4 w-4 mr-2 text-blue-500" />,
        description: 'Windows PowerShell'
    },
    {
        value: 'linux',
        label: 'Linux Terminal',
        icon: <TerminalSquare className="h-4 w-4 mr-2 text-green-500" />,
        description: 'Linux Bash Shell'
    },
    {
        value: 'bash',
        label: 'Git Bash',
        icon: <TerminalIcon className="h-4 w-4 mr-2 text-orange-500" />,
        description: 'Git Bash Terminal'
    }
]

export function TerminalSelector({ className, terminalId }: TerminalSelectorProps) {
    const { terminalType, setTerminalType, terminals } = useIDEStore()
    const [open, setOpen] = useState(false)

    // Belirli bir terminal ID'si sağlanmışsa, o terminalin tipini alın
    const currentTerminalType = terminalId
        ? terminals.find(t => t.id === terminalId)?.type || 'cmd'
        : terminalType;

    const selectedTerminal = terminalOptions.find(
        terminal => terminal.value === currentTerminalType
    )

    const handleSelectTerminal = (value: string) => {
        if (terminalId) {
            // Belirli bir terminal için tip değişikliği
            useIDEStore.setState(state => ({
                terminals: state.terminals.map(t =>
                    t.id === terminalId
                        ? { ...t, type: value as TerminalType }
                        : t
                )
            }));
        } else {
            // Genel terminal tipi değişikliği
            setTerminalType(value as TerminalType);
        }
        setOpen(false);
    };

    return (
        <div className={className}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-background border-0 px-2 h-7 text-xs"
                    >
                        <div className="flex items-center">
                            {selectedTerminal?.icon}
                            <span className="ml-1">{selectedTerminal?.label}</span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0">
                    <Command>
                        <CommandInput placeholder="Terminal ara..." className="h-9 text-sm" />
                        <CommandEmpty>Terminal bulunamadı.</CommandEmpty>
                        <CommandGroup>
                            <CommandList>
                                {terminalOptions.map((terminal) => (
                                    <CommandItem
                                        key={terminal.value}
                                        value={terminal.value}
                                        onSelect={handleSelectTerminal}
                                        className="text-sm"
                                    >
                                        <div className="flex items-center">
                                            {terminal.icon}
                                            <span>{terminal.label}</span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                currentTerminalType === terminal.value
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandList>
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
} 