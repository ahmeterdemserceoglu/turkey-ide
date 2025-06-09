'use client'

import { X, TerminalSquare, FileX, ArrowRight, Save, Copy, XSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { useIDEStore } from '@/store/ide-store'
import { cn } from '@/lib/utils'

export function TabBar() {
  const { tabs, activeTabId, setActiveTab, removeTab } = useIDEStore()

  // Tab operations
  const closeTab = (tabId: string) => {
    removeTab(tabId)
  }

  const closeTabsToRight = (currentTabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTabId)
    if (currentIndex === -1) return

    const tabsToClose = tabs.slice(currentIndex + 1)
    for (const tab of tabsToClose) {
      removeTab(tab.id)
    }
  }

  const closeSavedTabs = () => {
    const savedTabs = tabs.filter(tab => !tab.isDirty)
    for (const tab of savedTabs) {
      removeTab(tab.id)
    }
  }

  const closeOtherTabs = (currentTabId: string) => {
    const otherTabs = tabs.filter(tab => tab.id !== currentTabId)
    for (const tab of otherTabs) {
      removeTab(tab.id)
    }
  }

  const closeAllTabs = () => {
    for (const tab of tabs) {
      removeTab(tab.id)
    }
  }

  if (tabs.length === 0) {
    return null
  }

  const getTabIcon = (tab: typeof tabs[0]) => {
    // Linux Terminal tab
    if (tab.type === 'linux-terminal') {
      return <TerminalSquare className="w-4 h-4" />
    }

    // Regular file tab
    const ext = tab.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'js':
      case 'jsx':
        return '📄'
      case 'ts':
      case 'tsx':
        return '🔷'
      case 'html':
        return '🌐'
      case 'css':
        return '🎨'
      case 'json':
        return '📋'
      case 'md':
        return '📝'
      case 'py':
        return '🐍'
      case 'java':
        return '☕'
      case 'cpp':
      case 'c':
        return '⚙️'
      default:
        return '📄'
    }
  }

  return (
    <div className="flex bg-background border-b overflow-x-auto">
      {tabs.map((tab, index) => (
        <ContextMenu key={tab.id}>
          <ContextMenuTrigger>
            <div
              className={cn(
                "flex items-center min-w-0 border-r group hover:bg-accent/50",
                "transition-colors duration-200",
                activeTabId === tab.id ? "bg-accent" : ""
              )}
            >
              <button
                className="flex items-center px-3 py-2 min-w-0 flex-1"
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="mr-2 text-sm flex-shrink-0">
                  {getTabIcon(tab)}
                </span>
                <span
                  className={cn(
                    "text-sm truncate",
                    tab.isDirty ? "italic" : "",
                    activeTabId === tab.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {tab.name}
                  {tab.isDirty && <span className="ml-1">•</span>}
                </span>
              </button>

              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 w-6 p-0 mr-1 flex-shrink-0",
                  "opacity-0 group-hover:opacity-100 transition-opacity",
                  "hover:bg-destructive/20 hover:text-destructive"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  removeTab(tab.id)
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={() => closeTab(tab.id)}>
              <FileX className="h-4 w-4 mr-2" />
              <span>Dosyayı Kapat</span>
            </ContextMenuItem>

            {index < tabs.length - 1 && (
              <ContextMenuItem onClick={() => closeTabsToRight(tab.id)}>
                <ArrowRight className="h-4 w-4 mr-2" />
                <span>Sağdaki Sekmeleri Kapat</span>
              </ContextMenuItem>
            )}

            <ContextMenuItem onClick={closeSavedTabs}>
              <Save className="h-4 w-4 mr-2" />
              <span>Kaydedilenleri Kapat</span>
            </ContextMenuItem>

            {tabs.length > 1 && (
              <ContextMenuItem onClick={() => closeOtherTabs(tab.id)}>
                <Copy className="h-4 w-4 mr-2" />
                <span>Diğerlerini Kapat</span>
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            <ContextMenuItem onClick={closeAllTabs} className="text-red-500">
              <XSquare className="h-4 w-4 mr-2" />
              <span>Tümünü Kapat</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  )
}
