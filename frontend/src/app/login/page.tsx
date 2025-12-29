'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const [isFirstInstallation, setIsFirstInstallation] = useState(false)

  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()

  // Verificar se é primeira instalação e se já tem sessão
  useEffect(() => {
    const checkInstallationAndSession = async () => {
      console.log('[LoginPage] Checking installation status and session...')

      // Verificar se é primeira instalação
      try {
        const { data } = await api.get('/installation/check')
        if (data.is_first_installation) {
          console.log('[LoginPage] First installation detected, redirecting to onboarding')
          setIsFirstInstallation(true)
          router.replace('/onboarding')
          return
        }
      } catch (error) {
        console.error('[LoginPage] Error checking installation:', error)
      }

      // Se já tem session no store, redirecionar
      if (session) {
        console.log('[LoginPage] Session found in store, redirecting to dashboard')
        router.replace('/dashboard')
        return
      }

      // Verificar no Supabase também
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()

      if (supabaseSession) {
        console.log('[LoginPage] Session found in Supabase, redirecting to dashboard')
        setSession(supabaseSession)
        setUser(supabaseSession.user)
        router.replace('/dashboard')
        return
      }

      console.log('[LoginPage] No existing session found')
      setCheckingSession(false)
    }

    checkInstallationAndSession()
  }, [session, router, setSession, setUser])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('[LoginPage] Attempting login for:', email)

    try {
      // Tentar login via API local primeiro
      const { data } = await api.post('/auth/login', {
        email,
        password
      })

      if (data.success) {
        console.log('[LoginPage] Local login successful!', data)

        // Tentar login no Supabase
        const { data: supabaseData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError) {
          console.error('[LoginPage] Supabase login error:', authError)
          console.log('[LoginPage] Creating fake session from local login data')

          // Criar sessão fake a partir dos dados do backend
          const fakeSession = {
            access_token: data.token || 'fake-token',
            refresh_token: '',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer',
            user: {
              id: data.user.uuid,
              email: data.user.email,
              user_metadata: {
                name: data.user.name,
                display_name: data.user.display_name,
              }
            }
          }

          // Salvar sessão no localStorage
          localStorage.setItem('sb-mensager-auth-token', JSON.stringify(fakeSession))

          // Atualizar store
          setSession(fakeSession as unknown as Parameters<typeof setSession>[0])
          setUser(fakeSession.user as unknown as Parameters<typeof setUser>[0])

          toast.success('Login realizado com sucesso!')
          router.replace('/dashboard')
          return
        }

        if (supabaseData.session) {
          console.log('[LoginPage] Supabase login successful!')
          setSession(supabaseData.session)
          setUser(supabaseData.session.user)
          toast.success('Login realizado com sucesso!')
          router.replace('/dashboard')
        }
      }
    } catch (err) {
      console.error('[LoginPage] Login error:', err)
      const error = err as { response?: { data?: { error?: string } } }
      const errorMessage = error.response?.data?.error || 'Email ou senha inválidos'
      setError(errorMessage)
      toast.error('Erro ao fazer login', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading enquanto verifica sessão existente
  if (checkingSession || isFirstInstallation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">
            {isFirstInstallation ? 'Redirecionando para configuração inicial...' : 'Verificando sessão...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Nakawoot</CardTitle>
          <CardDescription className="text-center">
            Entre para acessar o painel de conversas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
