import { describe, it, expect } from 'vitest'
import { sanitize, sanitizeForPrompt, validateInput } from '@/lib/sanitize'

describe('sanitizeForPrompt', () => {
  // This function exists because the AI route previously ran user text through
  // `sanitize()`, which HTML-escapes. That corrupted the prompt: a job
  // description containing "<" reached the model as "&lt;".
  it('does NOT HTML-escape, so prompts reach the model intact', () => {
    const input = 'Build <Button /> components with a < b comparisons'
    expect(sanitizeForPrompt(input)).toBe(input)
  })

  it('leaves text that the old escaping sanitizer would have mangled', () => {
    // `sanitize()` strips /on\w+=/, which eats ordinary prose and code.
    const input = 'Set onClick= handlers and turn feature on=true'
    expect(sanitizeForPrompt(input)).toBe(input)
    expect(sanitize(input)).not.toBe(input)
  })

  it('preserves newlines and tabs, which job descriptions rely on', () => {
    expect(sanitizeForPrompt('Line one\nLine two\tIndented')).toBe('Line one\nLine two\tIndented')
  })

  it('strips C0 control characters', () => {
    expect(sanitizeForPrompt('clean\u0000null\u0007bell')).toBe('cleannullbell')
  })

  it('strips C1 control characters and DEL', () => {
    expect(sanitizeForPrompt('a\u007Fb\u009Fc')).toBe('abc')
  })

  it('collapses runs of three or more blank lines', () => {
    expect(sanitizeForPrompt('a\n\n\n\n\nb')).toBe('a\n\nb')
  })

  it('keeps a single blank line as a paragraph break', () => {
    expect(sanitizeForPrompt('a\n\nb')).toBe('a\n\nb')
  })

  it('trims surrounding whitespace', () => {
    expect(sanitizeForPrompt('  hello  ')).toBe('hello')
  })

  it('returns an empty string for non-string input', () => {
    expect(sanitizeForPrompt(undefined)).toBe('')
    expect(sanitizeForPrompt(null)).toBe('')
    expect(sanitizeForPrompt(42)).toBe('')
    expect(sanitizeForPrompt({})).toBe('')
  })

  it('does not truncate — length is enforced by the route on the raw body', () => {
    // The route checks the RAW input length and returns 400. Truncating here
    // would silently discard part of the user's job description, which is the
    // bug that existed when sanitize() sliced at 5000 before the length check.
    const long = 'a'.repeat(10_000)
    expect(sanitizeForPrompt(long)).toHaveLength(10_000)
  })
})

describe('sanitize (HTML-context escaping)', () => {
  it('escapes angle brackets', () => {
    expect(sanitize('<script>')).toBe('&lt;script&gt;')
  })

  it('strips javascript: URLs', () => {
    expect(sanitize('javascript:alert(1)')).toBe('alert(1)')
  })

  it('truncates at the maximum length', () => {
    expect(sanitize('a'.repeat(6000))).toHaveLength(5000)
  })

  it('returns an empty string for falsy input', () => {
    expect(sanitize('')).toBe('')
  })
})

describe('validateInput', () => {
  it('accepts non-empty text within the limit', () => {
    expect(validateInput('hello')).toBe(true)
  })

  it('rejects whitespace-only input', () => {
    expect(validateInput('   ')).toBe(false)
  })

  it('rejects input over the limit', () => {
    expect(validateInput('a'.repeat(5001))).toBe(false)
  })
})
