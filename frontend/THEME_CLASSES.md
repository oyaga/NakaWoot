# Guia de Classes CSS para Temas

## ⚠️ PROBLEMA IDENTIFICADO

O projeto está usando classes **hardcoded** (fixas) do Tailwind que não respondem aos temas customizados.

### Exemplos de Classes INCORRETAS ❌

```tsx
// NÃO FAZ ASSIM - Estas cores são fixas e não mudam com o tema
className="bg-slate-900 text-white border-slate-800"
className="bg-slate-950 text-green-50"
className="text-slate-400"
```

## ✅ SOLUÇÃO: Usar Variáveis CSS do Tema

### Classes CORRETAS que Respondem aos Temas

Ao invés de usar cores fixas, use as variáveis definidas em `globals.css`:

```tsx
// ✅ CORRETO - Usa variáveis do tema
className="bg-background text-foreground border-border"
className="bg-card text-card-foreground"
className="bg-popover text-popover-foreground"
className="bg-muted text-muted-foreground"
className="bg-primary text-primary-foreground"
className="bg-secondary text-secondary-foreground"
className="bg-accent text-accent-foreground"
className="bg-destructive text-destructive-foreground"
```

## 📋 Tabela de Substituição

| ❌ Classe Hardcoded | ✅ Variável do Tema | Uso |
|---------------------|---------------------|-----|
| `bg-slate-950` | `bg-background` | Fundo principal da página |
| `bg-slate-900` | `bg-card` | Fundo de cards e containers |
| `bg-slate-800` | `bg-secondary` ou `bg-input` | Inputs, botões secundários |
| `text-white` | `text-foreground` | Texto principal |
| `text-slate-400` | `text-muted-foreground` | Texto secundário/placeholder |
| `text-green-50` | `text-foreground` | Texto sobre fundos |
| `border-slate-800` | `border-border` | Bordas |
| `text-green-500` | `text-primary` | Cor de destaque principal |
| `bg-green-600` | `bg-primary` | Botões primários |

## 📝 Exemplos Práticos

### Dialog/Modal
```tsx
// ❌ ANTES
<DialogContent className="bg-slate-900 border-slate-800 text-green-50">

// ✅ DEPOIS
<DialogContent className="bg-popover border-border text-popover-foreground">
```

### Card
```tsx
// ❌ ANTES
<Card className="bg-slate-900 border-slate-800">

// ✅ DEPOIS
<Card className="bg-card border-border">
```

### Input
```tsx
// ❌ ANTES
<Input className="bg-slate-800 border-slate-700 text-green-50" />

// ✅ DEPOIS
<Input className="bg-input border-input text-foreground" />
```

### Button Secondary
```tsx
// ❌ ANTES
<Button className="bg-slate-800 hover:bg-slate-700 text-white">

// ✅ DEPOIS
<Button className="bg-secondary hover:bg-secondary/80 text-secondary-foreground">
```

### Skeleton/Loading
```tsx
// ❌ ANTES
<Skeleton className="bg-slate-800" />

// ✅ DEPOIS
<Skeleton className="bg-muted" />
```

## 🎨 Variáveis Disponíveis

Todas as variáveis definidas em `globals.css`:

- `background` - Fundo principal
- `foreground` - Texto principal
- `card` - Fundo de cards
- `card-foreground` - Texto em cards
- `popover` - Fundo de popovers/dialogs
- `popover-foreground` - Texto em popovers
- `primary` - Cor primária (verde no nosso caso)
- `primary-foreground` - Texto sobre primária
- `secondary` - Cor secundária
- `secondary-foreground` - Texto sobre secundária
- `muted` - Cor neutra/desativada
- `muted-foreground` - Texto neutro
- `accent` - Cor de destaque
- `accent-foreground` - Texto sobre destaque
- `destructive` - Cor de ação destrutiva (vermelho)
- `destructive-foreground` - Texto sobre destrutiva
- `border` - Cor de bordas
- `input` - Fundo de inputs
- `ring` - Cor do focus ring

## 🔥 Suporte a Dark Mode no Tailwind

Para classes que precisam variar entre light/dark:

```tsx
// Se precisar de comportamento diferente no dark mode
className="bg-white dark:bg-slate-950"

// Mas PREFIRA usar as variáveis do tema que já mudam automaticamente
className="bg-background" // Muda automaticamente com o tema
```

## ⚡ Benefícios

1. ✅ **Responde a todos os temas** (light, dark, midnight, forest)
2. ✅ **Fácil adicionar novos temas** - só editar `globals.css`
3. ✅ **Consistência visual** - todas as páginas usam as mesmas cores
4. ✅ **Menos código** - não precisa de `dark:` prefix em tudo
5. ✅ **Manutenção simples** - mudar cores em um só lugar

## 🚀 Próximos Passos

1. Substituir todas as classes hardcoded por variáveis
2. Testar todos os temas em todas as páginas
3. Garantir que transições funcionam suavemente
