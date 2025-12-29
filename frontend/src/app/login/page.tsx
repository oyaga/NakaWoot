'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const setUser = useAuthStore((state) => state.setUser)
  const router = useRouter()

  // Redirecionar automaticamente se já tiver sessão
  useEffect(() => {
    const checkExistingSession = async () => {
      console.log('[LoginPage] Checking for existing session...')
      
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

    checkExistingSession()
  }, [session, router, setSession, setUser])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    console.log('[LoginPage] Attempting login for:', email)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('[LoginPage] Login error:', authError)
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      console.log('[LoginPage] Login successful!')
      console.log('[LoginPage] Token expires at:', new Date(data.session.expires_at! * 1000).toISOString())
      setSession(data.session)
      setUser(data.session.user)
      router.replace('/dashboard')
    }

    setLoading(false)
  }

  // Mostrar loading enquanto verifica sessão existente
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Verificando sessão...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Mensager NK</CardTitle>
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
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
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