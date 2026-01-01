'use client'

import * as React from 'react'
import { Moon, Sun, Monitor, Palette } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
        <DropdownMenuLabel className="flex items-center gap-2 text-popover-foreground">
          <Palette className="h-4 w-4" />
          Tema da Interface
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer ${
            theme === 'light' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer ${
            theme === 'dark' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('midnight')}
          className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer ${
            theme === 'midnight' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <Moon className="mr-2 h-4 w-4 text-indigo-500" />
          <span>Midnight Blue</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('forest')}
          className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer ${
            theme === 'forest' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <Moon className="mr-2 h-4 w-4 text-emerald-600" />
          <span>Forest Green</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={`text-popover-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer ${
            theme === 'system' ? 'bg-accent text-accent-foreground' : ''
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
