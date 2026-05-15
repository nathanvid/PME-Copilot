// src/__tests__/tenant.test.ts
import { describe, it, expect } from 'vitest'
import { isValidTenantId, assertTenantId, extractTenantId } from '@/lib/tenants'

describe('isValidTenantId', () => {
  it('accepte un UUID v4 valide', () => {
    expect(isValidTenantId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('rejette une chaîne arbitraire', () => {
    expect(isValidTenantId('not-a-uuid')).toBe(false)
  })

  it('rejette un UUID v1 (version != 4)', () => {
    expect(isValidTenantId('550e8400-e29b-11d4-a716-446655440000')).toBe(false)
  })

  it('rejette une chaîne vide', () => {
    expect(isValidTenantId('')).toBe(false)
  })

  it('est insensible à la casse', () => {
    expect(isValidTenantId('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })
})

describe('assertTenantId', () => {
  it('ne lève pas d erreur sur un UUID valide', () => {
    expect(() =>
      assertTenantId('550e8400-e29b-41d4-a716-446655440000')
    ).not.toThrow()
  })

  it('lève une erreur sur undefined', () => {
    expect(() => assertTenantId(undefined)).toThrow('Invalid or missing tenant_id')
  })

  it('lève une erreur sur un UUID invalide', () => {
    expect(() => assertTenantId('bad-id')).toThrow('Invalid or missing tenant_id')
  })
})

describe('extractTenantId', () => {
  it('extrait un tenant_id valide depuis un JWT', () => {
    const jwt = { tenant_id: '550e8400-e29b-41d4-a716-446655440000', sub: 'user-123' }
    expect(extractTenantId(jwt)).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('retourne null si jwt est null', () => {
    expect(extractTenantId(null)).toBeNull()
  })

  it('retourne null si tenant_id absent du JWT', () => {
    expect(extractTenantId({ sub: 'user-123' })).toBeNull()
  })

  it('retourne null si tenant_id est un UUID invalide', () => {
    expect(extractTenantId({ tenant_id: 'bad-id' })).toBeNull()
  })

  it('retourne null si tenant_id n est pas une string', () => {
    expect(extractTenantId({ tenant_id: 12345 })).toBeNull()
  })
})