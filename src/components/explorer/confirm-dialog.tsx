'use client'

import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

export interface ConfirmDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    actionLabel: string
    onConfirm: () => void
    destructive?: boolean
    cancelLabel?: string
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    actionLabel,
    onConfirm,
    destructive = false,
    cancelLabel = "İptal"
}: ConfirmDialogProps) {
    const [dontAskAgain, setDontAskAgain] = useState(false)

    // Check if we have a stored preference for this action
    useEffect(() => {
        if (open) {
            const storedPrefs = localStorage.getItem('file-actions-preferences')
            if (storedPrefs) {
                const prefs = JSON.parse(storedPrefs)
                if (prefs[title] === true) {
                    // User chose to not be asked again for this action
                    onConfirm()
                    onOpenChange(false)
                }
            }
        }
    }, [open, title, onConfirm, onOpenChange])

    const handleConfirm = () => {
        if (dontAskAgain) {
            // Save preference
            const storedPrefs = localStorage.getItem('file-actions-preferences')
            const prefs = storedPrefs ? JSON.parse(storedPrefs) : {}
            prefs[title] = true
            localStorage.setItem('file-actions-preferences', JSON.stringify(prefs))
        }
        onConfirm()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 py-2">
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
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={destructive ? "destructive" : "default"}
                        onClick={handleConfirm}
                    >
                        {actionLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 