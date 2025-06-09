'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'

export interface SSHConnectionDetails {
    host: string
    port: string
    username: string
    password: string
    usePrivateKey: boolean
    privateKey: string
}

interface SSHDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConnect: (connection: SSHConnectionDetails) => void
}

export function SSHDialog({ open, onOpenChange, onConnect }: SSHDialogProps) {
    const [host, setHost] = useState('')
    const [port, setPort] = useState('22')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [usePrivateKey, setUsePrivateKey] = useState(false)
    const [privateKey, setPrivateKey] = useState('')

    const handleConnect = () => {
        onConnect({
            host,
            port,
            username,
            password,
            usePrivateKey,
            privateKey
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>SSH Bağlantısı</DialogTitle>
                    <DialogDescription>
                        SSH sunucusuna bağlanmak için bilgilerinizi girin
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="host" className="text-right">
                            Sunucu
                        </Label>
                        <Input
                            id="host"
                            placeholder="hostname veya IP"
                            className="col-span-3"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="port" className="text-right">
                            Port
                        </Label>
                        <Input
                            id="port"
                            placeholder="22"
                            className="col-span-3"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="username" className="text-right">
                            Kullanıcı Adı
                        </Label>
                        <Input
                            id="username"
                            placeholder="username"
                            className="col-span-3"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <div></div>
                        <div className="flex items-center space-x-2 col-span-3">
                            <Checkbox
                                id="use-private-key"
                                checked={usePrivateKey}
                                onCheckedChange={(checked) => setUsePrivateKey(checked === true)}
                            />
                            <Label htmlFor="use-private-key">Özel Anahtar Kullan</Label>
                        </div>
                    </div>

                    {!usePrivateKey ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Parola
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                className="col-span-3"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="private-key" className="text-right pt-2">
                                Özel Anahtar
                            </Label>
                            <Textarea
                                id="private-key"
                                className="col-span-3 h-20"
                                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="submit" onClick={handleConnect}>
                        Bağlan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 