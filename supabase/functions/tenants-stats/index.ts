import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  // Vérification du secret pour sécuriser le webhook
  const authHeader = req.headers.get('x-webhook-secret')
  if (authHeader !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  try {
    const { tenant_id } = await req.json()

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // service_role = pas de RLS, accès total pour les agrégations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    console.log('SUPABASE_URL:', SUPABASE_URL)

    // 1. Stats documents
    const { data: documents } = await supabase
      .from('documents')
      .select('status')
      .eq('tenant_id', tenant_id)

    const docStats = {
      total: documents?.length ?? 0,
      ready: documents?.filter((d) => d.status === 'ready').length ?? 0,
      pending: documents?.filter((d) => d.status === 'pending').length ?? 0,
      error: documents?.filter((d) => d.status === 'error').length ?? 0,
    }

    // 2. Stats conversations
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: conversations } = await supabase
      .from('conversations')
      .select('created_at')
      .eq('tenant_id', tenant_id)

    const convStats = {
      total: conversations?.length ?? 0,
      this_month: conversations?.filter((c) => c.created_at >= firstOfMonth).length ?? 0,
    }

    // 3. Stats tokens + latence (usage_logs)
    const { data: logs } = await supabase
      .from('usage_logs')
      .select('tokens_input, tokens_output, latency_ms')
      .eq('tenant_id', tenant_id)

    const totalInput = logs?.reduce((sum, l) => sum + (l.tokens_input ?? 0), 0) ?? 0
    const totalOutput = logs?.reduce((sum, l) => sum + (l.tokens_output ?? 0), 0) ?? 0
    const latencies = logs?.filter((l) => l.latency_ms).map((l) => l.latency_ms) ?? []
    const avgLatency = latencies.length
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0

    // Coût estimé : claude-sonnet pricing (approximatif)
    const costUsd = parseFloat((totalInput * 0.000003 + totalOutput * 0.000015).toFixed(4))

    // 4. Top documents les plus consultés
    const { data: messages } = await supabase
      .from('messages')
      .select('sources')
      .eq('tenant_id', tenant_id)
      .eq('role', 'assistant')
      .not('sources', 'is', null)

    const docHits: Record<string, number> = {}
    messages?.forEach((m) => {
      const sources = m.sources as { document_name: string }[]
      sources?.forEach((s) => {
        docHits[s.document_name] = (docHits[s.document_name] ?? 0) + 1
      })
    })

    const topDocuments = Object.entries(docHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, hits]) => ({ name, hits }))

    return new Response(
      JSON.stringify({
        documents: docStats,
        conversations: convStats,
        tokens: {
          input: totalInput,
          output: totalOutput,
          cost_usd: costUsd,
        },
        latency_avg_ms: avgLatency,
        top_documents: topDocuments,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
