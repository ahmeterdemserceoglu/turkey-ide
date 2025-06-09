'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

export interface InputDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    defaultValue: string
    placeholder: string
    actionLabel: string
    onConfirm: (value: string) => void
    cancelLabel?: string
    disabled?: boolean
    customContent?: React.ReactNode
    showDontAskOption?: boolean
    actionKey?: string
}

export function InputDialog({
    open,
    onOpenChange,
    title,
    description,
    defaultValue,
    placeholder,
    actionLabel,
    onConfirm,
    cancelLabel = "İptal",
    disabled = false,
    customContent,
    showDontAskOption = false,
    actionKey
}: InputDialogProps) {
    const [value, setValue] = React.useState(defaultValue)
    const [dontAskAgain, setDontAskAgain] = React.useState(false)

    React.useEffect(() => {
        if (open) {
            setValue(defaultValue)
            setDontAskAgain(false)
        }
    }, [open, defaultValue])

    const handleConfirm = () => {
        if (value.trim()) {
            if (showDontAskOption && dontAskAgain && actionKey) {
                // Save preference
                const storedPrefs = localStorage.getItem('file-actions-preferences')
                const prefs = storedPrefs ? JSON.parse(storedPrefs) : {}
                prefs[actionKey] = true
                localStorage.setItem('file-actions-preferences', JSON.stringify(prefs))
            }

            onConfirm(value.trim())
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {customContent ? (
                    customContent
                ) : (
                    <div className="py-4">
                        <Input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleConfirm()
                                }
                            }}
                        />
                    </div>
                )}

                {showDontAskOption && (
                    <div className="flex items-center space-x-2 pb-2">
                        <Checkbox
                            id="dontAskAgain"
                            checked={dontAskAgain}
                            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
                        />
                        <label
                            htmlFor="dontAskAgain"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Bir daha sorma
                        </label>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={disabled}
                    >
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 