#!/usr/bin/env node

/**
 * Script para substituir classes CSS hardcoded por variáveis de tema
 * Versão melhorada com suporte completo aos 4 temas
 *
 * Uso: node fix-themes.js
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);

// Mapeamento de substituições - ordem importa!
const replacements = [
  // ==================== BACKGROUNDS ====================

  // Slate backgrounds (dark shades)
  { from: /\bbg-slate-950\b/g, to: 'bg-background', desc: 'Background principal' },
  { from: /\bbg-slate-900\b/g, to: 'bg-card', desc: 'Cards e containers' },
  { from: /\bbg-slate-800\b/g, to: 'bg-secondary', desc: 'Elementos secundários' },
  { from: /\bbg-slate-700\b/g, to: 'bg-secondary', desc: 'Elementos secundários' },
  { from: /\bbg-slate-300\b/g, to: 'bg-muted', desc: 'Elementos neutros' },
  { from: /\bbg-slate-200\b/g, to: 'bg-muted', desc: 'Elementos neutros' },
  { from: /\bbg-slate-100\b/g, to: 'bg-accent', desc: 'Hover states' },
  { from: /\bbg-slate-50\b/g, to: 'bg-background', desc: 'Background claro' },

  // White backgrounds
  { from: /\bbg-white\b(?!\s*dark:)/g, to: 'bg-card', desc: 'Cards brancos' },

  // Blue backgrounds (usar primary)
  { from: /\bbg-blue-600\b/g, to: 'bg-primary', desc: 'Botões primários' },
  { from: /\bbg-blue-700\b/g, to: 'bg-primary', desc: 'Botões primários hover' },

  // Green backgrounds (usar primary também, pois é a cor do tema)
  { from: /\bbg-green-600\b/g, to: 'bg-primary', desc: 'Verde = primário' },
  { from: /\bbg-green-700\b/g, to: 'bg-primary', desc: 'Verde hover' },
  { from: /\bbg-green-500\b/g, to: 'bg-primary', desc: 'Verde badges' },

  // Red backgrounds (usar destructive)
  { from: /\bbg-red-600\b/g, to: 'bg-destructive', desc: 'Ações destrutivas' },
  { from: /\bbg-red-700\b/g, to: 'bg-destructive', desc: 'Ações destrutivas hover' },
  { from: /\bbg-red-500\b/g, to: 'bg-destructive', desc: 'Badges de erro' },

  // ==================== BORDERS ====================

  { from: /\bborder-slate-800\b/g, to: 'border-border', desc: 'Bordas' },
  { from: /\bborder-slate-700\b/g, to: 'border-border', desc: 'Bordas' },
  { from: /\bborder-slate-600\b/g, to: 'border-border', desc: 'Bordas' },
  { from: /\bborder-slate-300\b/g, to: 'border-border', desc: 'Bordas' },
  { from: /\bborder-slate-200\b/g, to: 'border-border', desc: 'Bordas' },
  { from: /\bborder-blue-700\b/g, to: 'border-primary', desc: 'Bordas primárias' },

  // ==================== TEXT COLORS ====================

  // Slate text
  { from: /\btext-slate-950\b/g, to: 'text-foreground', desc: 'Texto principal escuro' },
  { from: /\btext-slate-900\b/g, to: 'text-foreground', desc: 'Texto principal' },
  { from: /\btext-slate-800\b/g, to: 'text-foreground', desc: 'Texto principal' },
  { from: /\btext-slate-700\b/g, to: 'text-foreground', desc: 'Texto principal' },
  { from: /\btext-slate-600\b/g, to: 'text-muted-foreground', desc: 'Texto secundário' },
  { from: /\btext-slate-500\b/g, to: 'text-muted-foreground', desc: 'Texto secundário' },
  { from: /\btext-slate-400\b/g, to: 'text-muted-foreground', desc: 'Texto desabilitado' },
  { from: /\btext-slate-300\b/g, to: 'text-muted-foreground', desc: 'Texto desabilitado' },
  { from: /\btext-slate-200\b/g, to: 'text-foreground', desc: 'Texto claro (dark mode)' },

  // White text - REMOVER quando usado com dark:
  // Primeiro, remover casos específicos com dark:
  { from: /\btext-white\s+dark:text-white\b/g, to: 'text-foreground', desc: 'Texto branco redundante' },
  { from: /\bdark:text-white\b/g, to: '', desc: 'Remover dark:text-white' },

  // Blue text (usar primary)
  { from: /\btext-blue-600\b/g, to: 'text-primary', desc: 'Texto primário azul' },
  { from: /\btext-blue-400\b/g, to: 'text-primary', desc: 'Texto primário claro' },

  // Green text (usar primary)
  { from: /\btext-green-50\b/g, to: 'text-foreground', desc: 'Texto verde claro' },
  { from: /\btext-green-500\b/g, to: 'text-primary', desc: 'Texto verde' },
  { from: /\btext-green-400\b/g, to: 'text-primary', desc: 'Texto verde claro' },

  // ==================== HOVER STATES ====================

  { from: /\bhover:bg-slate-800\b/g, to: 'hover:bg-secondary', desc: 'Hover secundário' },
  { from: /\bhover:bg-slate-700\b/g, to: 'hover:bg-secondary', desc: 'Hover secundário' },
  { from: /\bhover:bg-slate-200\b/g, to: 'hover:bg-accent', desc: 'Hover claro' },
  { from: /\bhover:bg-slate-100\b/g, to: 'hover:bg-accent', desc: 'Hover claro' },

  { from: /\bhover:text-slate-700\b/g, to: 'hover:text-foreground', desc: 'Hover texto' },
  { from: /\bhover:text-slate-600\b/g, to: 'hover:text-foreground', desc: 'Hover texto' },

  { from: /\bhover:bg-blue-700\b/g, to: 'hover:bg-primary/90', desc: 'Hover primário' },
  { from: /\bhover:bg-green-700\b/g, to: 'hover:bg-primary/90', desc: 'Hover verde' },
  { from: /\bhover:bg-red-700\b/g, to: 'hover:bg-destructive/90', desc: 'Hover destrutivo' },

  { from: /\bhover:text-green-600\b/g, to: 'hover:text-primary', desc: 'Hover texto verde' },
  { from: /\bhover:text-green-400\b/g, to: 'hover:text-primary', desc: 'Hover texto verde' },

  // ==================== DARK MODE REMOVALS ====================
  // Remover todas as classes dark: que duplicam o comportamento

  { from: /\s*dark:bg-slate-950\b/g, to: '', desc: 'Remover dark:bg' },
  { from: /\s*dark:bg-slate-900\b/g, to: '', desc: 'Remover dark:bg' },
  { from: /\s*dark:bg-slate-800\b/g, to: '', desc: 'Remover dark:bg' },
  { from: /\s*dark:bg-slate-700\b/g, to: '', desc: 'Remover dark:bg' },
  { from: /\s*dark:bg-background\b/g, to: '', desc: 'Remover dark:bg redundante' },
  { from: /\s*dark:bg-card\b/g, to: '', desc: 'Remover dark:bg redundante' },
  { from: /\s*dark:bg-secondary\b/g, to: '', desc: 'Remover dark:bg redundante' },

  { from: /\s*dark:text-slate-700\b/g, to: '', desc: 'Remover dark:text' },
  { from: /\s*dark:text-slate-600\b/g, to: '', desc: 'Remover dark:text' },
  { from: /\s*dark:text-slate-500\b/g, to: '', desc: 'Remover dark:text' },
  { from: /\s*dark:text-slate-400\b/g, to: '', desc: 'Remover dark:text' },
  { from: /\s*dark:text-slate-200\b/g, to: '', desc: 'Remover dark:text' },
  { from: /\s*dark:text-foreground\b/g, to: '', desc: 'Remover dark:text redundante' },
  { from: /\s*dark:text-muted-foreground\b/g, to: '', desc: 'Remover dark:text redundante' },

  { from: /\s*dark:text-green-50\b/g, to: '', desc: 'Remover dark:text verde' },
  { from: /\s*dark:text-green-200\/60\b/g, to: '', desc: 'Remover dark:text verde' },
  { from: /\s*dark:text-green-400\b/g, to: '', desc: 'Remover dark:text verde' },
  { from: /\s*dark:text-blue-400\b/g, to: '', desc: 'Remover dark:text azul' },

  { from: /\s*dark:border-slate-800\b/g, to: '', desc: 'Remover dark:border' },
  { from: /\s*dark:border-slate-700\b/g, to: '', desc: 'Remover dark:border' },
  { from: /\s*dark:border-border\b/g, to: '', desc: 'Remover dark:border redundante' },

  { from: /\s*dark:hover:bg-slate-800\b/g, to: '', desc: 'Remover dark:hover:bg' },
  { from: /\s*dark:hover:bg-slate-700\b/g, to: '', desc: 'Remover dark:hover:bg' },
  { from: /\s*dark:hover:bg-secondary\b/g, to: '', desc: 'Remover dark:hover:bg redundante' },
  { from: /\s*dark:hover:bg-card\b/g, to: '', desc: 'Remover dark:hover:bg redundante' },

  { from: /\s*dark:hover:text-green-400\b/g, to: '', desc: 'Remover dark:hover:text' },
  { from: /\s*dark:hover:text-foreground\b/g, to: '', desc: 'Remover dark:hover:text redundante' },

  { from: /\s*dark:group-hover:text-foreground\b/g, to: '', desc: 'Remover dark:group-hover redundante' },

  // ==================== PLACEHOLDERS ====================

  { from: /\bplaceholder:text-green-200\/40\b/g, to: 'placeholder:text-muted-foreground', desc: 'Placeholder' },
  { from: /\bdark:placeholder:text-slate-600\b/g, to: '', desc: 'Remover dark:placeholder' },
  { from: /\bdark:placeholder:text-slate-500\b/g, to: '', desc: 'Remover dark:placeholder' },
];

async function getAllFiles(dir, fileList = []) {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      // Ignorar node_modules e .next
      if (file !== 'node_modules' && file !== '.next' && file !== 'out') {
        await getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function fixFile(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;
  const changes = [];

  for (const { from, to, desc } of replacements) {
    const matches = content.match(from);
    if (matches && matches.length > 0) {
      content = content.replace(from, to);
      modified = true;
      changes.push(`  - ${desc}: ${matches.length} ocorrência(s)`);
    }
  }

  // Limpar espaços duplicados em className
  content = content.replace(/className="([^"]*)"/g, (match, classes) => {
    const cleaned = classes
      .split(/\s+/)
      .filter(c => c.length > 0)
      .join(' ')
      .trim();
    return cleaned ? `className="${cleaned}"` : 'className=""';
  });

  // Limpar className vazias
  content = content.replace(/className=""\s*/g, '');

  if (modified) {
    await writeFile(filePath, content, 'utf-8');
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`\n✅ Fixed: ${relativePath}`);
    changes.forEach(change => console.log(change));
    return true;
  }

  return false;
}

async function main() {
  console.log('🎨 Fix Themes - Correção Automática de Classes CSS\n');
  console.log('🔍 Buscando arquivos...\n');

  const srcDir = path.join(__dirname, 'src');
  const files = await getAllFiles(srcDir);

  console.log(`📝 Encontrados ${files.length} arquivos\n`);
  console.log('🔧 Aplicando correções...\n');

  let fixedCount = 0;

  for (const file of files) {
    const wasFixed = await fixFile(file);
    if (wasFixed) {
      fixedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n✨ Concluído! ${fixedCount} arquivos foram corrigidos.`);
  console.log('\n📋 Próximos passos:');
  console.log('   1. Revise as mudanças com: git diff');
  console.log('   2. Teste todos os 4 temas: light, dark, midnight, forest');
  console.log('   3. Verifique contraste em todas as páginas');
  console.log('   4. Faça commit das mudanças\n');
}

main().catch(console.error);
