// src/test-ai-review.ts
// Fichier de test pour valider la pipeline AI review
// À supprimer après validation — NE PAS merger en main

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../supabase/lib/database.types'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const supabase: SupabaseClient<Database> = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ✅ ESLint : OK  — 🔴 AI CRITICAL : async sans try/catch
export async function fetchDocument(id: string): Promise<unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data } = await supabase.from('documents').select('*').eq('id', id)
  return data
}

// ✅ ESLint : OK  — 🔴 AI CRITICAL : tenant_id vient du body, faille multi-tenant
// Un user peut passer n'importe quel tenant_id et insérer dans un autre tenant
export async function insertDocument(body: {
  tenant_id: string
  content: string
  filename: string
}): Promise<unknown> {
  const { tenant_id, content, filename } = body
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result = await supabase.from('documents').insert({ tenant_id, content, filename })
  return result
}

// ✅ ESLint : OK  — 🔴 AI CRITICAL : pas de null guard sur chunk.content
// Si content est null/undefined → crash runtime non géré
export function processChunk(chunk: { content: unknown }): string {
  return (chunk.content as string | null)?.toUpperCase() ?? 'Inconnu'
}

// ✅ ESLint : OK  — 🟠 AI HIGH : magic numbers sans constantes nommées
export function calculateTokenCost(tokens: number): number {
  if (tokens > 100000) {
    return tokens * 0.000015
  } else if (tokens > 10000) {
    return tokens * 0.00002
  }
  return tokens * 0.00003
}

// ✅ ESLint : OK  — 🟠 AI HIGH : duplication exacte de calculateTokenCost
export function estimateCost(tokenCount: number): number {
  if (tokenCount > 100000) {
    return tokenCount * 0.000015
  } else if (tokenCount > 10000) {
    return tokenCount * 0.00002
  }
  return tokenCount * 0.00003
}

// ✅ ESLint : OK  — 🟠 AI HIGH : deux awaits séquentiels indépendants
// Devrait être Promise.all() → latence doublée inutilement
export async function loadTenantContext(tenantId: string): Promise<{
  users: unknown
  docs: unknown
}> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: users } = await supabase.from('users').select('*').eq('tenant_id', tenantId)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: docs } = await supabase.from('documents').select('*').eq('tenant_id', tenantId)
  return { users, docs }
}

// ✅ ESLint : OK  — 🟠 AI HIGH : Promise rejetée silencieusement ignorée
// Aucun await, aucun .catch() → erreur Supabase invisible
export function fireAndForget(tenantId: string): void {
  supabase.from('usage_logs').insert({ tenant_id: tenantId, action: 'ping' })
}

// ✅ ESLint : OK  — 🟡 AI MEDIUM : nested ternary illisible
export function getStatusLabel(status: string): string {
  return status === 'active'
    ? 'Actif'
    : status === 'pending'
      ? 'En attente'
      : status === 'error'
        ? 'Erreur'
        : 'Inconnu'
}

// ✅ ESLint : OK  — 🟡 AI MEDIUM : pas de null guard sur created_at
// Si created_at est null → crash sur .split()
export function formatDoc(doc: { filename: string; created_at: string }): string {
  return `${doc.filename} - ${doc.created_at?.split('T')[0] ?? 'Inconnu'}`
}
