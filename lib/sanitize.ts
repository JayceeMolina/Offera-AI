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

/**
 * Clean user text that is about to be embedded in an LLM prompt.
 *
 * Deliberately does NOT HTML-escape, unlike `sanitize()` above.
 *
 * WHY: `sanitize()` turns `<` into `&lt;` and strips anything matching
 * /on\w+=/. That is the right shape for text destined for an HTML context, but
 * the AI route embeds this string in a prompt sent to a language model. Escaping
 * there actively corrupts the input the user asked us to process -- a job
 * description containing `<` , a code snippet, or a phrase like "on=" arrives at
 * the model mangled, and the generated cover letter is worse for it.
 *
 * Escaping is also not what protects the response. `renderMarkdown` in
 * app/ai/page.tsx builds React elements, so model output is rendered as text
 * nodes and never as HTML. There is no `dangerouslySetInnerHTML` anywhere in the
 * codebase. XSS safety is structural, not dependent on this function.
 *
 * What this DOES do is strip control characters, which have no legitimate place
 * in pasted job text and can be used to smuggle confusing sequences into a
 * prompt. Newlines and tabs are preserved because job descriptions rely on them.
 *
 * Note: this does not attempt to defeat prompt injection. That is not solvable
 * by input filtering -- the model sees user text either way. The mitigations
 * that matter here are that the route requires a valid JWT, is rate limited, and
 * the output is only ever shown back to the same user who submitted the input.
 */
export function sanitizeForPrompt(input: unknown): string {
  if (typeof input !== 'string') return ''

  return input
    // Strip C0/C1 control characters except \t (09) and \n (0A).
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '')
    // Collapse runs of 3+ blank lines; models gain nothing from the padding.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}