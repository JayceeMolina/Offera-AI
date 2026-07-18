// AI TOOLS PAGE
// AI tools page at /ai matching Job Ledger design style.
// Left sidebar mirrors dashboard sidebar for consistent navigation.
// Three tools: Cover Letter, Interview Questions, Resume Bullet.
// Uses OpenRouter free AI via /api/ai route.
// Supports dark mode.
// Sends JWT token with every AI request for authentication.
// Mobile responsive — sidebar hidden on mobile, bottom nav shown instead.

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useInactivityLogout } from '@/lib/useInactivityLogout'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors text-base"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

type Tool = 'cover_letter' | 'interview_questions' | 'resume_bullet'

const tools: { id: Tool; label: string; icon: string; desc: string; placeholder: string }[] = [
  {
    id: 'cover_letter',
    label: 'Cover Letter',
    icon: '📝',
    desc: 'Generate a tailored cover letter from your context.',
    placeholder: 'Paste the job description here. Include the company name, role, and any requirements. The more detail you give, the better the cover letter.',
  },
  {
    id: 'interview_questions',
    label: 'Interview Questions',
    icon: '🎤',
    desc: 'Get likely interview questions for a role.',
    placeholder: 'Paste the job description or job title here. Include the tech stack or key skills if relevant.',
  },
  {
    id: 'resume_bullet',
    label: 'Resume Bullet',
    icon: '✨',
    desc: 'Improve your weak resume bullet points.',
    placeholder: 'Paste your weak resume bullet point here.\n\ne.g. "Helped with the website"\n\nThe AI will rewrite it with strong action verbs and quantifiable results.',
  },
]

function renderMarkdown(text: string) {
  return text.split('\n').map((line, i) => {
    if (/^\|[-| ]+\|$/.test(line.trim())) return null
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim())
      return (
        <div key={i} className="flex gap-2 py-2 text-sm border-b border-[#E2DDD6] dark:border-slate-700">
          {cells.map((cell, j) => {
            const parts = cell.split(/\*\*(.*?)\*\*/g)
            return (
              <span key={j} className="flex-1">
                {parts.map((part, k) =>
                  k % 2 === 1 ? <strong key={k}>{part}</strong> : <span key={k}>{part.replace(/\*/g, '')}</span>
                )}
              </span>
            )
          })}
        </div>
      )
    }
    if (line.trim() === '') return <div key={i} className="h-3" />
    const parts = line.split(/\*\*(.*?)\*\*/g)
    return (
      <p key={i} className="mb-1">
        {parts.map((part, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-semibold text-[#1E1915] dark:text-slate-100">{part}</strong>
            : <span key={j}>{part.replace(/\*/g, '')}</span>
        )}
      </p>
    )
  })
}

export default function AIToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('cover_letter')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  useInactivityLogout()
  // Prevent browser back/forward after logout
  useEffect(() => {
    window.history.replaceState(null, '', window.location.href)
    window.onpopstate = () => {
      window.history.replaceState(null, '', window.location.href)
    }
    return () => { window.onpopstate = null }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleGenerate = async () => {
    if (!input.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ tool: activeTool, input }),
      })
      const data = await response.json()
      setOutput(data.result || data.error || 'Something went wrong. Please try again.')
    } catch {
      setOutput('Error connecting to AI. Please try again.')
    }
    setLoading(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const currentTool = tools.find(t => t.id === activeTool)!
  const labelClass = 'block text-xs font-semibold uppercase tracking-widest text-[#7A7068] dark:text-slate-400 mb-2'

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100 overflow-hidden">

      {/* LEFT SIDEBAR — hidden on mobile, visible on desktop */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 border-r border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900 flex-col overflow-y-auto">
        <div className="px-6 py-5 border-b border-[#E2DDD6] dark:border-slate-800">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#8B3A2A] dark:text-slate-100">Offera AI</p>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#A8A099] dark:text-slate-500 mb-4">AI Tools</p>
          <div className="space-y-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setInput(''); setOutput('') }}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  activeTool === tool.id
                    ? 'bg-[#8B3A2A] text-white dark:bg-indigo-600'
                    : 'text-[#4A4540] dark:text-slate-400 hover:bg-[#E8E4DC] dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{tool.icon}</span>
                  <span className="text-[15px] font-medium">{tool.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 border-t border-[#E2DDD6] dark:border-slate-800 mt-auto space-y-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-left text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors py-1.5"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors py-1.5"
          >
            ← Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* TOP BAR */}
        <header className="flex items-center gap-4 px-4 lg:px-6 py-4 border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#8B3A2A] dark:text-slate-100 whitespace-nowrap">
            Offera AI
          </p>
          <span className="text-[#C4BDB5] dark:text-slate-700 hidden lg:block">|</span>
          <span className="text-base text-[#A8A099] dark:text-slate-400 hidden lg:block">AI Tools</span>
          <div className="flex-1" />
          <ThemeToggle />
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm px-3 lg:px-4 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors font-medium"
          >
            ← Dashboard
          </button>
        </header>

        {/* TOOL CONTENT */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-5xl mx-auto space-y-4 lg:space-y-6">

            {/* Tool tabs — scrollable on mobile */}
            <div className="flex gap-2 border-b border-[#E2DDD6] dark:border-slate-800 pb-0 overflow-x-auto">
              {tools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => { setActiveTool(tool.id); setInput(''); setOutput('') }}
                  className={`flex items-center gap-2 px-4 lg:px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                    activeTool === tool.id
                      ? 'border-[#8B3A2A] text-[#8B3A2A] dark:border-indigo-500 dark:text-indigo-400'
                      : 'border-transparent text-[#A8A099] dark:text-slate-500 hover:text-[#4A4540] dark:hover:text-slate-300'
                  }`}
                >
                  <span>{tool.icon}</span>
                  {tool.label}
                </button>
              ))}
            </div>

            {/* Tool header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 px-5 py-4 flex items-center gap-3">
              <span className="text-2xl">{currentTool.icon}</span>
              <div>
                <p className="font-semibold text-base text-[#1E1915] dark:text-slate-100">{currentTool.label}</p>
                <p className="text-sm text-[#9A9389] dark:text-slate-500">{currentTool.desc}</p>
              </div>
            </div>

            {/* Input + Output — stacked on mobile, side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

              {/* Input */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-5 flex flex-col gap-4">
                <p className={labelClass}>Role & Company Context</p>
                <textarea
                  rows={8}
                  placeholder={currentTool.placeholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className={
                    'flex-1 w-full px-3.5 py-2.5 text-base rounded-lg border resize-y ' +
                    'border-[#D9D4CB] bg-[#F5F2ED] text-[#2C2C2C] placeholder-[#A8A099] ' +
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 ' +
                    'focus:outline-none focus:border-[#8B3A2A] focus:ring-1 focus:ring-[#8B3A2A] ' +
                    'dark:focus:border-indigo-500 dark:focus:ring-indigo-500 transition-colors'
                  }
                />
                <button
                  onClick={handleGenerate}
                  disabled={loading || !input.trim()}
                  className="w-full h-11 rounded-lg text-base font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2 bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700"
                >
                  {loading ? (
                    <><span className="animate-spin text-lg">⏳</span> Generating...</>
                  ) : (
                    <><span>✨</span> Generate</>
                  )}
                </button>
              </div>

              {/* Output */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className={labelClass}>Output</p>
                  {output && (
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-1.5 rounded-lg ${
                        copied
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'text-[#8B3A2A] dark:text-indigo-400 hover:bg-[#F0EDE6] dark:hover:bg-slate-800'
                      }`}
                    >
                      {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                  )}
                </div>

                {output ? (
                  <div className="flex-1 px-4 py-3 rounded-lg border border-[#E2DDD6] dark:border-slate-700 bg-[#F5F2ED] dark:bg-slate-800 overflow-y-auto">
                    <div className="text-base text-[#2C2C2C] dark:text-slate-100 leading-relaxed">
                      {renderMarkdown(output)}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-48 rounded-lg border-2 border-dashed border-[#E2DDD6] dark:border-slate-700">
                    {loading ? (
                      <div className="text-center space-y-2">
                        <p className="text-3xl animate-pulse">🤖</p>
                        <p className="text-base text-[#A8A099] dark:text-slate-500">AI is thinking...</p>
                      </div>
                    ) : (
                      <div className="text-center space-y-2">
                        <p className="text-3xl opacity-30">📄</p>
                        <p className="text-base text-[#C4BDB5] dark:text-slate-600">Output will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV — hidden on desktop */}
        <div className="lg:hidden flex justify-between items-center px-4 py-3 border-t border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            ← Dashboard
          </button>
          <div className="flex gap-1">
            {tools.map(tool => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setInput(''); setOutput('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === tool.id
                    ? 'bg-[#8B3A2A] text-white dark:bg-indigo-600'
                    : 'text-[#4A4540] dark:text-slate-400 hover:bg-[#E8E4DC] dark:hover:bg-slate-800'
                }`}
              >
                {tool.icon}
              </button>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-[#A8A099] dark:text-slate-500 hover:text-[#1E1915] dark:hover:text-slate-100 transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </div>
  )
}