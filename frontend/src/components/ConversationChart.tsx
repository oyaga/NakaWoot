'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from '@/components/ui/button'
import api from '@/lib/api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from 'lucide-react'

interface ConversationDataPoint {
  date: string
  count: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    payload: ConversationDataPoint
  }>
}

interface ConversationStatsResponse {
  period: string
  data: ConversationDataPoint[]
}

type PeriodType = '7' | '15' | '30'

export default function ConversationChart() {
  const [data, setData] = useState<ConversationDataPoint[]>([])
  const [period, setPeriod] = useState<PeriodType>('30')
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get<ConversationStatsResponse>(`/dashboard/conversation-stats?period=${period}`)
      setData(response.data.data)
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error('Erro ao carregar dados do gráfico', {
        description: err.response?.data?.error || 'Tente novamente mais tarde'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ConversationDataPoint
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
          <p className="text-green-200/80 text-xs font-medium mb-1">{dataPoint.date}</p>
          <p className="text-green-50 text-sm font-bold">
            {payload[0].value} {payload[0].value === 1 ? 'conversa' : 'conversas'}
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32 bg-slate-800" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16 bg-slate-800" />
            <Skeleton className="h-9 w-16 bg-slate-800" />
            <Skeleton className="h-9 w-16 bg-slate-800" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full bg-slate-800/50 rounded-lg" />
      </div>
    )
  }

  const totalConversations = data.reduce((sum, item) => sum + item.count, 0)
  const maxConversations = Math.max(...data.map(item => item.count), 0)
  const avgConversations = data.length > 0 ? (totalConversations / data.length).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* Header com período e estatísticas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-600/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-green-200/60">Total no período</p>
            <p className="text-2xl font-bold text-green-50">{totalConversations}</p>
          </div>
          <div className="ml-4">
            <p className="text-sm text-green-200/60">Média diária</p>
            <p className="text-2xl font-bold text-green-50">{avgConversations}</p>
          </div>
          <div className="ml-4">
            <p className="text-sm text-green-200/60">Máximo</p>
            <p className="text-2xl font-bold text-green-50">{maxConversations}</p>
          </div>
        </div>

        {/* Seletor de período */}
        <div className="flex gap-2">
          {(['7', '15', '30'] as PeriodType[]).map((p) => (
            <Button
              key={p}
              onClick={() => setPeriod(p)}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              className={
                period === p
                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                  : 'border-slate-700 text-green-200/80 hover:bg-slate-800 hover:text-green-50'
              }
            >
              {p}d
            </Button>
          ))}
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#94a3b8' }}
            />
            <YAxis
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tick={{ fill: '#94a3b8' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              fill="url(#colorCount)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda e info */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-green-200/60">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
            <span>Conversas criadas</span>
          </div>
        </div>
        <p className="text-xs text-green-200/50">
          Últimos {period} dias
        </p>
      </div>
    </div>
  )
}
