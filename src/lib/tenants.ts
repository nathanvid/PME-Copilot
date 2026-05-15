export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Vérifie qu'un tenant_id est un UUID v4 valide.
 * Utilisé avant toute insertion ou requête en BDD.
 */
export function isValidTenantId(id: string): boolean {
  return UUID_V4_REGEX.test(id)
}

/**
 * Lève une erreur si le tenant_id est invalide.
 * À appeler en entrée de chaque Edge Function.
 */
export function assertTenantId(id: string | undefined): asserts id is string {
  if (!id || !isValidTenantId(id)) {
    throw new Error(`Invalid or missing tenant_id: "${id}"`)
  }
}

/**
 * Extrait le tenant_id du JWT Supabase.
 * Retourne null si absent — jamais d'exception ici,
 * c'est à l'appelant de décider quoi faire.
 */
export function extractTenantId(jwt: Record<string, unknown> | null): string | null {
  if (!jwt) return null
  const id = jwt['tenant_id']
  if (typeof id !== 'string') return null
  return isValidTenantId(id) ? id : null
}
