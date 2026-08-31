import { describe, it, expect } from 'vitest'
import {
  checkPassword,
  getPasswordStrength,
  validatePassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_RULE_COUNT,
} from '@/lib/password'

// A password that satisfies every rule, used as the baseline for negative tests.
const STRONG = 'Str0ng!Passw0rd'

describe('checkPassword', () => {
  it('returns one entry per rule so the UI can render a checklist', () => {
    expect(checkPassword('')).toHaveLength(PASSWORD_RULE_COUNT)
  })

  it('passes every rule for a strong password', () => {
    expect(checkPassword(STRONG).every(c => c.passed)).toBe(true)
  })

  it('fails every rule for an empty password', () => {
    expect(checkPassword('').some(c => c.passed)).toBe(false)
  })

  it.each([
    ['too short', 'Ab1!', 0],
    ['no uppercase', 'str0ng!passw0rd', 1],
    ['no lowercase', 'STR0NG!PASSW0RD', 2],
    ['no digit', 'Strong!Password', 3],
    ['no special character', 'Str0ngPassw0rd', 4],
  ])('flags %s', (_label, password, failingIndex) => {
    const checks = checkPassword(password)
    expect(checks[failingIndex].passed).toBe(false)
  })
})

describe('getPasswordStrength', () => {
  it('scores a fully compliant password as valid', () => {
    const strength = getPasswordStrength(STRONG)
    expect(strength.score).toBe(PASSWORD_RULE_COUNT)
    expect(strength.valid).toBe(true)
    expect(strength.label).toBe('Strong')
  })

  it('is not valid when any single rule fails', () => {
    // One character short of the minimum, everything else satisfied.
    const almost = 'Ab1!' + 'x'.repeat(MIN_PASSWORD_LENGTH - 5)
    const strength = getPasswordStrength(almost)
    expect(strength.score).toBeLessThan(PASSWORD_RULE_COUNT)
    expect(strength.valid).toBe(false)
  })

  it('is not valid beyond MAX_PASSWORD_LENGTH even with every rule passing', () => {
    // bcrypt silently truncates at 72 bytes, so accepting more would give a
    // false impression of added strength.
    const tooLong = STRONG + 'a'.repeat(MAX_PASSWORD_LENGTH)
    const strength = getPasswordStrength(tooLong)
    expect(strength.score).toBe(PASSWORD_RULE_COUNT)
    expect(strength.valid).toBe(false)
  })
})

describe('validatePassword', () => {
  it('accepts a strong password by returning null', () => {
    expect(validatePassword(STRONG)).toBeNull()
  })

  it('rejects a non-string', () => {
    expect(validatePassword(undefined)).toBe('Password is required.')
    expect(validatePassword(12345678)).toBe('Password is required.')
    expect(validatePassword(null)).toBe('Password is required.')
  })

  it('rejects an empty string', () => {
    expect(validatePassword('')).toBe('Password is required.')
  })

  it('rejects a password over the maximum length', () => {
    const message = validatePassword('a'.repeat(MAX_PASSWORD_LENGTH + 1))
    expect(message).toContain(String(MAX_PASSWORD_LENGTH))
  })

  it('rejects the single-character password that used to slip through reset', () => {
    // Regression guard: before the shared policy existed, the reset page
    // enforced nothing and would accept "a".
    expect(validatePassword('a')).not.toBeNull()
  })

  it('names the first unmet rule rather than a generic failure', () => {
    expect(validatePassword('short')).toContain('at least')
  })
})
