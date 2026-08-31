// PRIVACY POLICY PAGE
// Explains what data Offera AI collects and how it is used.
// Accessible at /privacy from the login/signup page.
// Supports dark mode with theme toggle.

'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'


export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F0EDE6] dark:bg-slate-950 text-[#1E1915] dark:text-slate-100">

      {/* NAVBAR */}
      <nav className="border-b border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-900 px-6 py-3 flex justify-between items-center">
        <Link href="/login" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-bold text-base tracking-tight text-[#8B3A2A] dark:text-slate-100">Offera AI</span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* CONTENT */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#E2DDD6] dark:border-slate-800 p-10 space-y-8">

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1E1915] dark:text-slate-100">Privacy Policy</h1>
            <p className="text-[#A8A099] dark:text-slate-400 mt-2 text-sm">Last updated: August 2026</p>
          </div>

          {[
            {
              title: '1. What We Collect',
              content: 'We collect your email address when you create an account. We also store the job application data you enter including company names, job titles, notes, and descriptions. We do not collect your name, phone number, or payment information.',
            },
            {
              title: '2. How We Use Your Data',
              content: 'Your email is used solely for authentication and account recovery. Your job application data is used only to power your personal dashboard. We do not sell, share, or use your data for advertising.',
            },
            {
              title: '3. AI Tools',
              content: 'When you use AI tools, your input is sent to OpenRouter, which routes the request to one of its available free AI models to generate a response. We do not store your AI inputs or outputs. Because OpenRouter selects the model at request time, the specific model provider that processes your input may vary between requests. OpenRouter\u2019s privacy policy, and that of the selected model provider, apply to data processed through their service. Avoid pasting information you would not want sent to a third-party AI provider.',
            },
            {
              title: '4. Automation',
              content: 'Automatic job importing is not currently available. No job data is imported from any third party, and no automated process reads or writes your account. Every application in your dashboard is one you added yourself. If automated importing is introduced in future, this policy will be updated before the feature is enabled.',
            },
            {
              title: '5. Data Storage',
              content: 'Your data is stored securely in PostgreSQL. Each user can only access their own data — enforced at the database level using Row Level Security. Passwords are hashed and never stored in plain text.',
            },
            {
              title: '6. Cookies & Sessions',
              content: 'We use session cookies to keep you logged in. While the app is open, you are signed out automatically after 30 minutes without interaction. This is a convenience feature that runs in your browser — it does not survive a page reload, so on a shared or public computer you should sign out explicitly rather than relying on it. We do not use tracking or advertising cookies.',
            },
            {
              title: '7. Data Deletion',
              content: 'You can delete any job application at any time from your dashboard. To request full account deletion including your email and all data, contact us and we will process it within 7 days.',
            },
            {
              title: '8. Security',
              content: 'We implement industry-standard security practices including JWT authentication, rate limiting on login and account-related endpoints, brute-force lockout, input sanitization, encrypted data transmission enforced via HSTS, and a Content Security Policy that restricts which scripts and network connections the app is allowed to make. Automated checks run on every code change before it is deployed. No security measure is absolute, so please use a unique password and sign out on shared devices.',
            },
            {
              title: '9. Third-Party Services',
              content: 'Offera AI integrates with two third-party services: Supabase (database and authentication) and OpenRouter (AI text generation, which in turn forwards requests to the model provider it selects). Each has its own privacy policy. We share only the minimum data required for each to function.',
            },
            {
              title: '10. Changes to This Policy',
              content: 'We may update this policy occasionally. Continued use of Offera AI after changes means you accept the updated policy.',
            },
            {
              title: '11. Contact',
              content: 'For any privacy concerns or data deletion requests, please reach out via the contact information on our GitHub repository.',
            },
          ].map((section) => (
            <div key={section.title} className="space-y-2 border-t border-[#E2DDD6] dark:border-slate-800 pt-6">
              <h2 className="text-base font-semibold text-[#1E1915] dark:text-slate-100">{section.title}</h2>
              <p className="text-[#7A7068] dark:text-slate-400 leading-relaxed text-sm">{section.content}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#E2DDD6] dark:border-slate-800 bg-[#F8F6F2] dark:bg-slate-950 px-6 py-6 text-center text-sm text-[#A8A099] dark:text-slate-500">
        <Link href="/login" className="hover:underline text-[#8B3A2A] dark:text-indigo-400">← Back to Offera AI</Link>
      </footer>

    </div>
  )
}