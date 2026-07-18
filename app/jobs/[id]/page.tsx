// JOB DETAIL PAGE
// Shows full details of a single job application.
// User can edit the status, notes, and other fields.
// User can also delete the application.
// [id] is a dynamic route — each job has its own page.

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Job = {
  id: string
  company_name: string
  job_title: string
  job_description: string
  job_url: string
  status: string
  applied_date: string
  notes: string
}

const statusColors: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800',
  exam: 'bg-yellow-100 text-yellow-800',
  interview: 'bg-purple-100 text-purple-800',
  offer: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function JobDetailPage() {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    fetchJob()
  }, [])

  const fetchJob = async () => {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) console.error(error)
    else setJob(data)
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('job_applications')
      .update(job!)
      .eq('id', params.id)

    if (error) alert('Error saving changes.')
    else alert('Changes saved!')
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this application?')) return
    const { error } = await supabase
      .from('job_applications')
      .delete()
      .eq('id', params.id)

    if (error) alert('Error deleting.')
    else router.push('/dashboard')
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!job) return <div className="flex items-center justify-center min-h-screen">Job not found.</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* NAVBAR */}
      <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🎯 Job Tracker</h1>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        {/* STATUS PIPELINE */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              {['applied', 'exam', 'interview', 'offer', 'rejected'].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${job.status === s ? statusColors[s] : 'bg-gray-100 text-gray-400'}`}>
                    {s === 'applied' ? '📝' : s === 'exam' ? '📋' : s === 'interview' ? '🎤' : s === 'offer' ? '🎉' : '❌'}
                  </div>
                  <span className={`text-xs capitalize ${job.status === s ? 'font-bold' : 'text-gray-400'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* JOB FORM */}
        <Card>
          <CardHeader>
            <CardTitle>{job.company_name} — {job.job_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={job.company_name}
                onChange={(e) => setJob({ ...job, company_name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input value={job.job_title}
                onChange={(e) => setJob({ ...job, job_title: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={job.status} onValueChange={(value) => setJob({ ...job, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Applied</Label>
              <Input type="date" value={job.applied_date}
                onChange={(e) => setJob({ ...job, applied_date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Job URL</Label>
              <Input value={job.job_url || ''}
                onChange={(e) => setJob({ ...job, job_url: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Job Description</Label>
              <Textarea rows={5} value={job.job_description || ''}
                onChange={(e) => setJob({ ...job, job_description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={job.notes || ''}
                onChange={(e) => setJob({ ...job, notes: e.target.value })} />
            </div>

            <div className="flex gap-3">
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}