#!/usr/bin/env node

/**
 * Script para corrigir ordenação de conversas e badges persistentes
 * Remove lógica local desnecessária e confia no backend
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/dashboard/conversations/page.tsx');

console.log('🔧 Aplicando correções de ordenação de conversas...\n');

let content = fs.readFileSync(filePath, 'utf-8');
let changes = [];

// 1. Remover declaração de unreadCounts
const unreadCountsPattern = /const \[unreadCounts, setUnreadCounts\] = useState<Record<number, number>>\({}\)\n/g;
if (content.match(unreadCountsPattern)) {
  content = content.replace(unreadCountsPattern, '');
  changes.push('✅ Removido estado local unreadCounts');
}

// 2. Simplificar sortConversations - remover local_last_message_at
const sortPattern = /const timestampA = a\.local_last_message_at \|\| a\.last_activity_at \|\| a\.created_at\s+const timestampB = b\.local_last_message_at \|\| b\.last_activity_at \|\| b\.created_at/g;
if (content.match(sortPattern)) {
  content = content.replace(sortPattern,
    'const timestampA = a.last_activity_at || a.created_at\n      const timestampB = b.last_activity_at || b.created_at');
  changes.push('✅ Simplificado sortConversations (removido local_last_message_at)');
}

// 3. Atualizar comentário da função sortConversations
const commentPattern = /\/\/ Prioridade: 1\) Conversas com mensagens novas não lidas \(local_last_message_at\)\s+\/\/\s+2\) last_activity_at do servidor\s+\/\/\s+3\) created_at/g;
if (content.match(commentPattern)) {
  content = content.replace(commentPattern,
    '// Prioridade: 1) last_activity_at do servidor (atualizado pelo backend)\n  //             2) created_at');
  changes.push('✅ Atualizado comentário da função sortConversations');
}

// 4. Remover linhas que setam local_last_message_at
const localTimestampPattern = /\s+if \(activeConversation !== message\.conversation_id && !message\.is_from_me && message\.message_type !== 1\) \{\s+conv\.local_last_message_at = now\s+\}\s+/g;
content = content.replace(localTimestampPattern, '\n');
if (content !== content.replace(localTimestampPattern, '\n')) {
  changes.push('✅ Removido local_last_message_at do handleNewMessage');
}

// 5. Remover setUnreadCounts
const setUnreadPattern = /\s+setUnreadCounts\(prevCounts => \(\{\s+\.\.\.prevCounts,\s+\[conv\.id\]: conv\.unread_count\s+\}\)\)\s+/g;
content = content.replace(setUnreadPattern, '\n');
if (content !== content.replace(setUnreadPattern, '\n')) {
  changes.push('✅ Removido setUnreadCounts locais');
}

// 6. Remover incremento manual de unread_count
const unreadIncrementPattern = /\s+conv\.unread_count = \(conv\.unread_count \|\| 0\) \+ 1\s+/g;
content = content.replace(unreadIncrementPattern, '');
if (content !== content.replace(unreadIncrementPattern, '')) {
  changes.push('✅ Removido incremento manual de unread_count');
}

// 7. Simplificar handleConversationUpdated - remover preservação de local_last_message_at
const preservePattern = /return \{\s+\.\.\.conversation,\s+local_last_message_at: c\.local_last_message_at \/\/ Mantém o timestamp local\s+\}/g;
if (content.match(preservePattern)) {
  content = content.replace(preservePattern, 'return conversation');
  changes.push('✅ Simplificado handleConversationUpdated');
}

// 8. Substituir unreadCounts[conversation.id] por conversation.unread_count
const unreadAccessPattern = /unreadCounts\[conversation\.id\] \|\| conversation\.unread_count \|\| 0/g;
if (content.match(unreadAccessPattern)) {
  content = content.replace(unreadAccessPattern, 'conversation.unread_count || 0');
  changes.push('✅ Substituído acesso a unreadCounts por conversation.unread_count');
}

// 9. Remover limpeza de local_last_message_at no useEffect de activeConversation
const cleanupPattern = /: \{ \.\.\.conv, unread_count: 0, local_last_message_at: undefined \}/g;
if (content.match(cleanupPattern)) {
  content = content.replace(cleanupPattern, ': conv');
  changes.push('✅ Removido limpeza de local_last_message_at ao abrir conversa');
}

// 10. Atualizar comentário sobre timestamp local
content = content.replace(/\/\/ Mesmo timestamp local para manter consistência/g,
  '// Atualização automática via backend (conversation.updated event)');

// 11. Atualizar comentário sobre marcar como "nova"
content = content.replace(/\/\/ Marcar como "nova" se tem mensagens não lidas \(badge persiste até ler\)/g,
  '// Badge "NOVA" baseado em unread_count do servidor');

// Salvar arquivo
fs.writeFileSync(filePath, content, 'utf-8');

console.log('📊 Mudanças aplicadas:\n');
changes.forEach(change => console.log(change));

console.log('\n✨ Correções aplicadas com sucesso!');
console.log('\n📋 Próximos passos:');
console.log('   1. Revisar mudanças: git diff');
console.log('   2. Testar ordenação em tempo real');
console.log('   3. Verificar badges NOVA');
console.log('   4. Fazer commit das mudanças\n');
