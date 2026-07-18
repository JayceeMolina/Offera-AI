// INPUT SANITIZER
// Strips dangerous characters from user input before saving to DB or sending to AI.
// Prevents XSS attacks and prompt injection attempts.
// Enforces max input length to prevent abuse and oversized API requests.

const MAX_LENGTH = 5000

export function sanitize(input: string): string {
  if (!input) return ''
  return input
    .slice(0, MAX_LENGTH)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

export function validateInput(input: string, maxLength = MAX_LENGTH): boolean {
  return typeof input === 'string' && input.trim().length > 0 && input.length <= maxLength
}