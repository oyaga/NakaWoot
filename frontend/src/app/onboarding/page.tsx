'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Building2, User, Mail, Lock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'

interface OnboardingForm {
  accountName: string
  userName: string
  email: string
  password: string
  confirmPassword: string
}

export default function OnboardingPage() {
  const [formData, setFormData] = useState<OnboardingForm>({
    accountName: '',
    userName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleChange = (field: keyof OnboardingForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/installation/onboard', {
        account_name: formData.accountName,
        user_name: formData.userName,
        email: formData.email,
        password: formData.password
      })

      console.log('[Onboarding] Success:', response.data)

      setSuccess(true)
      toast.success('Conta criada com sucesso!', {
        description: 'Redirecionando para o login...'
      })

      // Aguardar 2 segundos antes de redirecionar
      setTimeout(() => {
        router.push('/login')
      }, 2000)

    } catch (err) {
      console.error('[Onboarding] Error:', err)

      // Verificar se é erro de bloqueio do navegador
      const error = err as { response?: { data?: { error?: string } }, message?: string }

      let errorMessage = 'Erro ao criar conta'

      if (error.message?.includes('ERR_BLOCKED_BY_CLIENT') || error.message?.includes('Network Error')) {
        errorMessage = 'Requisição bloqueada. Por favor, desative extensões de bloqueio (Ad Blocker) e tente novamente.'
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast.error('Erro no cadastro', {
        description: errorMessage,
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-12 pb-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                Conta criada com sucesso!
              </h2>
              <p className="text-sm text-green-700 dark:text-green-300">
                Bem-vindo ao <strong>Nakawoot</strong>
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70">
                Redirecionando para o login...
              </p>
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl text-center font-bold">
            Bem-vindo ao Nakawoot
          </CardTitle>
          <CardDescription className="text-center text-base">
            Configure sua conta para começar a usar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações da Conta */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Building2 className="h-4 w-4" />
                <span>Informações da Empresa</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Nome da Empresa *</Label>
                <Input
                  id="accountName"
                  type="text"
                  placeholder="Acme Inc."
                  value={formData.accountName}
                  onChange={handleChange('accountName')}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Nome da sua organização ou empresa
                </p>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Informações do Administrador */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <User className="h-4 w-4" />
                <span>Dados do Administrador</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="userName">Nome Completo *</Label>
                <Input
                  id="userName"
                  type="text"
                  placeholder="João Silva"
                  value={formData.userName}
                  onChange={handleChange('userName')}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email *</span>
                  </div>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@acme.com"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Senha *</span>
                    </div>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange('password')}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                A senha deve ter pelo menos 6 caracteres
              </p>
            </div>

            {/* Botão de Submissão */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta e Começar'
              )}
            </Button>

            {/* Nota de privacidade */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Ao criar uma conta, você concorda com nossos termos de uso e política de privacidade
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
