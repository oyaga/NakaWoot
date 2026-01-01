'use client'

import { UserCheck, CheckCircle2, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ActivityProps {
  type: string
  userName?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export function ChatActivity({ type, userName, createdAt, metadata }: ActivityProps) {
  const dateLabel = format(new Date(createdAt), "HH:mm", { locale: ptBR })

  const renderContent = () => {
    switch (type) {
      case 'assignee_changed':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5" />
            <span>
              <strong>{userName || 'Sistema'}</strong> assumiu o atendimento
            </span>
          </div>
        )
      case 'status_changed':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              Status alterado para <strong>{metadata?.status === 1 ? 'Resolvido' : 'Aberto'}</strong>
            </span>
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Evento de sistema registrado</span>
          </div>
        )
    }
  }

  return (
    <div className="flex justify-center my-4">
      <div className="bg-accent/50 px-4 py-1.5 rounded-full border border-border/60 flex items-center gap-3 text-[11px]">
        {renderContent()}
        <span className="text-muted-foreground font-mono">{dateLabel}</span>
      </div>
    </div>
  )
}
