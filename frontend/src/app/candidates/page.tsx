'use client'
import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuth } from '@/app/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PlusCircle, User } from 'lucide-react'

interface Candidate {
  _id: string
  name: string
  email: string
  createdBy?: {
    name?: string
  }
}

export default function CandidatesPage() {
  const router = useRouter()
  const { user, token, loading } = useAuth()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [name, setName] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [loadingState, setLoadingState] = useState<boolean>(false)

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    fetchCandidates()
  }, [user, loading, router])

  const fetchCandidates = async () => {
    try {
      const res = await axios.get<Candidate[]>('http://localhost:5000/api/candidates', axiosConfig)
      setCandidates(res.data)
    } catch (err) {
      console.error('Error fetching candidates:', err)
    }
  }

  const handleAddCandidate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name || !email) return

    setLoadingState(true)
    try {
      const res = await axios.post<Candidate>(
        'http://localhost:5000/api/candidates',
        { name, email },
        axiosConfig
      )
      setCandidates((prev) => [res.data, ...prev])
      setName('')
      setEmail('')
    } catch (err) {
      console.error('Error adding candidate:', err)
    } finally {
      setLoadingState(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Candidates</h1>
          <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Add Candidate Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCandidate} className="flex flex-col md:flex-row gap-2">
              <Input
                placeholder="Full name"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              />
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={loadingState}>
                <PlusCircle className="w-4 h-4 mr-2" />
                {loadingState ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Candidate List */}
        <div className="space-y-4">
          {candidates.length === 0 ? (
            <p className="text-muted-foreground">No candidates yet. Add your first one above.</p>
          ) : (
            candidates.map((candidate) => (
              <Card
                key={candidate._id}
                className="cursor-pointer hover:shadow-md transition"
                onClick={() => router.push(`/candidates/${candidate._id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-8 h-8 text-gray-500" />
                    <div>
                      <p className="font-semibold">{candidate.name}</p>
                      <p className="text-sm text-muted-foreground">{candidate.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Added by {candidate.createdBy?.name || 'Unknown'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
