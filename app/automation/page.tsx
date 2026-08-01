// AUTOMATION GUIDE PAGE
// Explains how users can set up n8n on their PC to auto-import jobs from Remotive.
// Step-by-step guide with Docker setup, workflow import, and configuration.
// 100% free, safe, and legal. Personal use only.
// Accessible at /automation from the dashboard.

'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-9 h-9" />
  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 rounded-lg border border-[#D9D4CB] dark:border-slate-700 flex items-center justify-center hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <pre className="bg-[#1E1915] dark:bg-slate-800 text-[#F0EDE6] dark:text-slate-200 text-sm rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-[#4A4540] text-[#E2DDD6] hover:bg-[#7A7068] transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}

function StepNumber({ num }: { num: number }) {
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#8B3A2A] dark:bg-indigo-600 text-white text-sm font-bold flex-shrink-0">
      {num}
    </span>
  )
}

export default function AutomationPage() {
  return (
    <div className="min-h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2]/90 dark:bg-slate-950/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="font-bold text-base tracking-tight text-[#8B3A2A] dark:text-slate-100">Offera AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard"
              className="text-sm px-4 py-2 rounded-lg border border-[#D9D4CB] dark:border-slate-700 text-[#4A4540] dark:text-slate-300 hover:bg-[#E8E4DC] dark:hover:bg-slate-800 transition-colors font-medium"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-6 lg:p-10 space-y-10">

          {/* HEADER */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#F5F2ED] dark:bg-indigo-950 text-[#8B3A2A] dark:text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#E2DDD6] dark:border-indigo-800 mb-4">
              Free &bull; Safe &bull; Legal
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1E1915] dark:text-slate-100">
              Auto-Import Jobs with n8n
            </h1>
            <p className="text-[#7A7068] dark:text-slate-400 mt-3 leading-relaxed">
              Set up a free automation on your PC that fetches remote job listings from{' '}
              <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="text-[#8B3A2A] dark:text-indigo-400 underline hover:opacity-80">Remotive</a>
              {' '}and adds them directly to your Offera AI dashboard — automatically, every 12 hours.
            </p>
          </div>

          {/* WHAT YOU GET */}
          <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-5 border border-[#E2DDD6] dark:border-slate-700">
            <h2 className="font-semibold text-base mb-3 text-[#1E1915] dark:text-slate-100">What this does:</h2>
            <ul className="space-y-2 text-sm text-[#4A4540] dark:text-slate-300">
              <li className="flex items-start gap-2"><span className="text-[#8B3A2A] dark:text-indigo-400">1.</span> Fetches the latest remote software dev jobs from Remotive (free public API)</li>
              <li className="flex items-start gap-2"><span className="text-[#8B3A2A] dark:text-indigo-400">2.</span> Filters them by your chosen keywords (e.g. &quot;react&quot;, &quot;frontend&quot;, &quot;typescript&quot;)</li>
              <li className="flex items-start gap-2"><span className="text-[#8B3A2A] dark:text-indigo-400">3.</span> Adds matching jobs to your dashboard with status &quot;Applied&quot;</li>
              <li className="flex items-start gap-2"><span className="text-[#8B3A2A] dark:text-indigo-400">4.</span> Skips duplicates automatically (won&apos;t add the same job twice)</li>
            </ul>
          </div>

          {/* REQUIREMENTS */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8">
            <h2 className="text-xl font-bold text-[#1E1915] dark:text-slate-100 mb-4">Requirements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '🐳', label: 'Docker Desktop', desc: 'Free download' },
                { icon: '💻', label: 'Your PC', desc: 'Windows, Mac, or Linux' },
                { icon: '⏱️', label: '10 minutes', desc: 'One-time setup' },
              ].map(item => (
                <div key={item.label} className="bg-[#F8F6F2] dark:bg-slate-800 rounded-lg p-4 border border-[#E2DDD6] dark:border-slate-700 text-center">
                  <p className="text-2xl mb-1">{item.icon}</p>
                  <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100">{item.label}</p>
                  <p className="text-xs text-[#A8A099] dark:text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={1} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Install Docker Desktop</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Docker runs n8n in an isolated container on your PC. It&apos;s lightweight (~100-200 MB RAM).
            </p>
            <a
              href="https://www.docker.com/products/docker-desktop/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm px-5 py-2.5 rounded-lg font-semibold text-white bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
            >
              Download Docker Desktop →
            </a>
            <p className="text-xs text-[#A8A099] dark:text-slate-500">
              No account required to use it. Available for Windows, Mac, and Linux.
            </p>
          </div>

          {/* STEP 2 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={2} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Run n8n</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Open your terminal (Command Prompt, PowerShell, or Terminal) and run:
            </p>
            <CodeBlock>{`docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n`}</CodeBlock>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Then open <span className="font-mono text-[#8B3A2A] dark:text-indigo-400">http://localhost:5678</span> in your browser. That&apos;s your n8n dashboard.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Note:</strong> n8n will ask you to create a local owner account (username + password). This is stored on your machine only — no online signup needed.
              </p>
            </div>
          </div>

          {/* STEP 3 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={3} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Run the Duplicate Prevention SQL</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Go to your <strong>Supabase Dashboard → SQL Editor</strong> and run this once. It prevents the same job from being added twice:
            </p>
            <CodeBlock>{`CREATE UNIQUE INDEX IF NOT EXISTS idx_job_applications_url
ON job_applications (user_id, job_url)
WHERE job_url IS NOT NULL AND job_url != '';`}</CodeBlock>
          </div>

          {/* STEP 4 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={4} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Download &amp; Import the Workflow</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Download the pre-built workflow file and import it into n8n:
            </p>
            <a
              href="/n8n-workflow-remotive.json"
              download
              className="inline-block text-sm px-5 py-2.5 rounded-lg font-semibold text-white bg-[#8B3A2A] hover:bg-[#7A3224] dark:bg-indigo-600 dark:hover:bg-indigo-700 transition-colors"
            >
              Download Workflow JSON
            </a>
            <div className="space-y-2 text-sm text-[#7A7068] dark:text-slate-400">
              <p>To import in n8n:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Open n8n at <span className="font-mono text-[#8B3A2A] dark:text-indigo-400">http://localhost:5678</span></li>
                <li>Click <strong>&quot;Add workflow&quot;</strong> (or the + icon)</li>
                <li>Click the <strong>three dots (...)</strong> menu → <strong>&quot;Import from file&quot;</strong></li>
                <li>Select the downloaded <span className="font-mono">n8n-workflow-remotive.json</span> file</li>
              </ol>
            </div>
          </div>

          {/* STEP 5 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={5} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Configure Your Credentials</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              In the imported workflow, you need to replace 3 placeholder values in the <strong>&quot;Insert to Supabase&quot;</strong> node:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-[#E2DDD6] dark:border-slate-700 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#F5F2ED] dark:bg-slate-800">
                    <th className="text-left px-4 py-2.5 font-semibold text-[#4A4540] dark:text-slate-300 border-b border-[#E2DDD6] dark:border-slate-700">Placeholder</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-[#4A4540] dark:text-slate-300 border-b border-[#E2DDD6] dark:border-slate-700">Where to find it</th>
                  </tr>
                </thead>
                <tbody className="text-[#7A7068] dark:text-slate-400">
                  <tr className="border-b border-[#E2DDD6] dark:border-slate-700">
                    <td className="px-4 py-2.5 font-mono text-xs text-[#8B3A2A] dark:text-indigo-400">YOUR_SUPABASE_URL</td>
                    <td className="px-4 py-2.5">Supabase → Settings → API → Project URL</td>
                  </tr>
                  <tr className="border-b border-[#E2DDD6] dark:border-slate-700">
                    <td className="px-4 py-2.5 font-mono text-xs text-[#8B3A2A] dark:text-indigo-400">YOUR_SUPABASE_ANON_KEY</td>
                    <td className="px-4 py-2.5">Supabase → Settings → API → anon public key</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#8B3A2A] dark:text-indigo-400">YOUR_USER_UUID</td>
                    <td className="px-4 py-2.5">Supabase → Authentication → Users → copy your ID</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* STEP 6 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={6} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Customize Your Keywords</h2>
            </div>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              In the <strong>&quot;Filter and Map Jobs&quot;</strong> node, find the keywords array and change it to match the roles you&apos;re looking for:
            </p>
            <CodeBlock>{`// Edit this line to match YOUR target jobs:
const keywords = ['frontend', 'react', 'next.js', 'full stack', 'typescript', 'web developer', 'software engineer'];`}</CodeBlock>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Examples: <span className="font-mono text-xs">&apos;data analyst&apos;</span>, <span className="font-mono text-xs">&apos;product manager&apos;</span>, <span className="font-mono text-xs">&apos;ui/ux&apos;</span>, <span className="font-mono text-xs">&apos;python&apos;</span>, <span className="font-mono text-xs">&apos;java&apos;</span>
            </p>
          </div>

          {/* STEP 7 */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <div className="flex items-center gap-3">
              <StepNumber num={7} />
              <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Test &amp; Activate</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-[#7A7068] dark:text-slate-400 pl-2">
              <li>Click <strong>&quot;Test workflow&quot;</strong> in n8n to run it once manually</li>
              <li>Check your Offera AI dashboard — new jobs should appear</li>
              <li>If it works, toggle the workflow <strong>ON</strong> (top-right switch)</li>
              <li>It will now run automatically every 12 hours while Docker is running</li>
            </ol>
          </div>

          {/* IMPORTANT NOTES */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Important Notes</h2>
            <div className="space-y-3">
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-4 border border-[#E2DDD6] dark:border-slate-700">
                <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100 mb-1">Runs only when your PC is on</p>
                <p className="text-sm text-[#7A7068] dark:text-slate-400">
                  The automation runs on your computer. If your PC is off or Docker isn&apos;t running, it won&apos;t execute until next time.
                </p>
              </div>
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-4 border border-[#E2DDD6] dark:border-slate-700">
                <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100 mb-1">Very lightweight</p>
                <p className="text-sm text-[#7A7068] dark:text-slate-400">
                  Uses ~100-200 MB RAM (less than a Chrome tab). Near-zero CPU when idle.
                </p>
              </div>
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-4 border border-[#E2DDD6] dark:border-slate-700">
                <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100 mb-1">100% Private</p>
                <p className="text-sm text-[#7A7068] dark:text-slate-400">
                  Jobs are imported into YOUR account only. No one else sees them. Your Supabase credentials stay on your machine.
                </p>
              </div>
              <div className="bg-[#F5F2ED] dark:bg-slate-800 rounded-lg p-4 border border-[#E2DDD6] dark:border-slate-700">
                <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100 mb-1">Legal &amp; Ethical</p>
                <p className="text-sm text-[#7A7068] dark:text-slate-400">
                  This uses Remotive&apos;s free public API meant for developers. Each imported job links back to{' '}
                  <a href="https://remotive.com" target="_blank" rel="noopener noreferrer" className="text-[#8B3A2A] dark:text-indigo-400 underline">remotive.com</a>
                  {' '}and credits them as the source — as required by their terms.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">FAQ</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Do I need to create an n8n account?',
                  a: 'No. When self-hosted, n8n only asks for a local username/password stored on your machine. No online registration.',
                },
                {
                  q: 'Is Docker free?',
                  a: 'Yes. Docker Desktop is free for personal use and small businesses.',
                },
                {
                  q: 'Can I change how often it runs?',
                  a: 'Yes. In the "Every 12 Hours" trigger node, change the interval to whatever you want (e.g., every 6 hours, every 24 hours).',
                },
                {
                  q: 'What if I want to stop the automation?',
                  a: 'Toggle the workflow OFF in n8n, or simply stop Docker. No jobs will be imported until you turn it back on.',
                },
                {
                  q: 'Will it add duplicate jobs?',
                  a: 'No. The SQL index you set up in Step 3 prevents the same job URL from being inserted twice.',
                },
                {
                  q: 'What job categories are available?',
                  a: 'Remotive offers: software-dev, customer-support, design, marketing, sales, product, business, data, devops, finance, human-resources, qa, writing, and more.',
                },
              ].map(faq => (
                <div key={faq.q} className="border border-[#E2DDD6] dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm font-semibold text-[#1E1915] dark:text-slate-100">{faq.q}</p>
                  <p className="text-sm text-[#7A7068] dark:text-slate-400 mt-1">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CATEGORY REFERENCE */}
          <div className="border-t border-[#E2DDD6] dark:border-slate-800 pt-8 space-y-4">
            <h2 className="text-lg font-bold text-[#1E1915] dark:text-slate-100">Remotive Job Categories</h2>
            <p className="text-sm text-[#7A7068] dark:text-slate-400">
              Change the category in the &quot;Fetch Remotive Jobs&quot; node URL to target different job types:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'software-dev', 'customer-support', 'design', 'marketing',
                'sales', 'product', 'business', 'data', 'devops',
                'finance', 'human-resources', 'qa', 'writing', 'all-others',
              ].map(cat => (
                <span key={cat} className="text-xs px-2.5 py-1 rounded-full bg-[#F5F2ED] dark:bg-slate-800 text-[#4A4540] dark:text-slate-400 border border-[#E2DDD6] dark:border-slate-700 font-mono">
                  {cat}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#A8A099] dark:text-slate-500">
              Example URL: <span className="font-mono">https://remotive.com/api/remote-jobs?category=design&amp;limit=30</span>
            </p>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-950 px-6 py-6 text-center text-sm text-[#A8A099] dark:text-slate-500">
        <Link href="/dashboard" className="hover:underline text-[#8B3A2A] dark:text-indigo-400">← Back to Dashboard</Link>
      </footer>

    </div>
  )
}
