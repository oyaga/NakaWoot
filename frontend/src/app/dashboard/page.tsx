'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, MessageSquare, Clock, Inbox, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import ConversationChart from '@/components/ConversationChart'

interface DashboardStats {
  total_inboxes: number
  total_conversations: number
  average_response_time: string
  conversation_trend: string
  inbox_trend: string
  response_time_trend: string
  recent_activity: RecentActivityItem[]
}

interface RecentActivityItem {
  id: number
  name: string
  email: string
  status: string
  type: string
  time: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await api.get<DashboardStats>('/dashboard/stats')
      setStats(response.data)
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error('Erro ao carregar estatísticas', {
        description: err.response?.data?.error || 'Tente novamente mais tarde'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend: string) => {
    return trend.startsWith('+') || trend.startsWith('-') ? (
      trend.startsWith('+') ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )
    ) : null
  }

  const getTrendColor = (trend: string) => {
    if (trend.startsWith('+')) return 'text-green-400'
    if (trend.startsWith('-')) return 'text-red-400'
    return 'text-green-200/50'
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8 bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 bg-slate-800" />
            <Skeleton className="h-4 w-64 mt-2 bg-slate-800" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardHeader>
                <Skeleton className="h-4 w-24 bg-slate-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 bg-slate-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <p className="text-green-200/60">Erro ao carregar dados</p>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Inboxes',
      value: stats.total_inboxes.toString(),
      icon: Inbox,
      description: 'Canais ativos',
      trend: stats.inbox_trend,
    },
    {
      title: 'Conversas',
      value: stats.total_conversations.toLocaleString('pt-BR'),
      icon: MessageSquare,
      description: 'Total geral',
      trend: stats.conversation_trend,
    },
    {
      title: 'Tempo Médio',
      value: stats.average_response_time,
      icon: Clock,
      description: 'Tempo de resposta',
      trend: stats.response_time_trend,
    },
  ]

  return (
    <div className="flex-1 space-y-6 p-8 bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-green-50">Dashboard</h2>
          <p className="text-green-200/60 mt-1">Visão geral do sistema Mensager NK</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDashboardStats}
            variant="outline"
            className="border-slate-700 text-green-50 hover:bg-slate-800"
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-200/80">
                {stat.title}
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center">
                <stat.icon className="h-5 w-5 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-50">{stat.value}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-medium flex items-center gap-1 ${getTrendColor(stat.trend)}`}>
                  {getTrendIcon(stat.trend)}
                  {stat.trend}
                </span>
                <p className="text-xs text-green-200/50">
                  {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart Area */}
        <Card className="col-span-4 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-green-50">Visão Geral</CardTitle>
            <CardDescription className="text-green-200/60">
              Conversas nos últimos 30 dias
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ConversationChart />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-green-50">Atividade Recente</CardTitle>
            <CardDescription className="text-green-200/60">
              Últimas atualizações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recent_activity.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-green-200/40">
                <Users className="h-8 w-8 mb-2 text-green-500/50" />
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            ) : (
              <div className="space-y-6">
                {stats.recent_activity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-50 truncate">
                        {activity.name}
                      </p>
                      {activity.email && (
                        <p className="text-xs text-green-200/50 truncate">
                          {activity.email}
                        </p>
                      )}
                      <p className="text-xs text-green-400 mt-1">
                        {activity.status}
                      </p>
                    </div>
                    <div className="text-xs text-green-200/40 flex-shrink-0">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-colors cursor-pointer group">
          <Link href="/dashboard/conversations">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-600/10 flex items-center justify-center group-hover:bg-green-600/20 transition-colors">
                  <MessageSquare className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-50">Ver Conversas</h3>
                  <p className="text-sm text-green-200/60">Gerencie suas conversas ativas</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-colors cursor-pointer group">
          <Link href="/dashboard/contacts">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-600/10 flex items-center justify-center group-hover:bg-green-600/20 transition-colors">
                  <Users className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-50">Gerenciar Contatos</h3>
                  <p className="text-sm text-green-200/60">Adicione e edite seus contatos</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-colors cursor-pointer group">
          <Link href="/dashboard/inboxes">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-600/10 flex items-center justify-center group-hover:bg-green-600/20 transition-colors">
                  <Inbox className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-50">Configurar Inboxes</h3>
                  <p className="text-sm text-green-200/60">Configure canais de atendimento</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  )
}
