'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import { useSocket } from '@/app/contexts/SocketContext'
import axios from 'axios'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ArrowLeft, Send, AlertCircle } from 'lucide-react'

interface Candidate {
  _id: string
  name: string
  email: string
}

interface User {
  _id: string
  name: string
  email?: string
  userId?: string
}

interface Note {
  _id: string
  content: string
  authorId?: {
    name: string
  }
  authorName?: string
  createdAt: string
}

export default function CandidateDetail() {
  const { id } = useParams()
  const { user, token, loading } = useAuth()
  const { socket } = useSocket()
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loadingNote, setLoadingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingNotes, setFetchingNotes] = useState(true)
    const [showUserSuggestions, setShowUserSuggestions] = useState(false)
  const [userSuggestions, setUserSuggestions] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0)

  const axiosConfig = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  useEffect(() => {
    if (loading) return    
    if (!user || !token) {
      router.push('/login')
      return
    }

    fetchCandidate()
    fetchNotes()
    fetchAllUsers()
  }, [user, token, loading, id, router])

  useEffect(() => {
    if (socket && id) {
      socket.emit('join-candidate-room', id)
      
      const handleNewNote = (note: Note) => {
        setNotes((prev: Note[]) => {
          const exists = prev.some((existingNote: Note) => existingNote._id === note._id)
          if (exists) {
            return prev
          }
          return [...prev, note]
        })
      }
      
      socket.on('new-note', handleNewNote)
      
      return () => {
        socket.emit('leave-candidate-room', id)
        socket.off('new-note', handleNewNote)
      }
    }
  }, [socket, id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showUserSuggestions) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedSuggestionIndex(prev => 
            prev < userSuggestions.length - 1 ? prev + 1 : 0
          )
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedSuggestionIndex(prev => 
            prev > 0 ? prev - 1 : userSuggestions.length - 1
          )
        } else if (e.key === 'Enter' && userSuggestions.length > 0) {
          e.preventDefault()
          insertUserMention(userSuggestions[selectedSuggestionIndex])
        } else if (e.key === 'Escape') {
          setShowUserSuggestions(false)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showUserSuggestions, userSuggestions, selectedSuggestionIndex])

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get<User[]>('http://localhost:5000/api/auth/users', axiosConfig)
      const validUsers = response.data.filter((user: User) => user && user.name && user._id)
      setAllUsers(validUsers)
    } catch (error) {
      console.error('Error fetching users:', error)
      setAllUsers([])
    }
  }

  const fetchCandidate = async () => {
    try {
      setError(null)
      const res = await axios.get<Candidate>(
        `http://localhost:5000/api/candidates/${id}`, 
        axiosConfig
      )
      setCandidate(res.data)
    } catch (err: unknown) {
      console.error('Error fetching candidate:', err)
      
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error
        setError(errorMessage)
        
        if (err.response?.status === 401) {
          router.push('/login')
        }
      } else {
        setError('Failed to fetch candidate')
      }
    }
  }

  const fetchNotes = async () => {
    try {
      setError(null)
      setFetchingNotes(true)
      
      const res = await axios.get<Note[]>(
        `http://localhost:5000/api/notes/${id}/notes`, 
        axiosConfig
      )
      
      setNotes(res.data)
    } catch (err: unknown) {
      console.error('Error fetching notes:', err)
      
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error
        setError(errorMessage)
        
        if (err.response?.status === 401) {
          router.push('/login')
        } else if (err.response?.status === 404) {
          setError('Candidate not found')
        }
      } else {
        setError('Failed to fetch notes')
      }
    } finally {
      setFetchingNotes(false)
    }
  }

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const position = e.target.selectionStart
    
    setNewNote(value)
    setCursorPosition(position)
    
    const beforeCursor = value.substring(0, position)
    const atMatch = beforeCursor.match(/@(\w*)$/)
    
    if (atMatch) {
      const searchTerm = atMatch[1].toLowerCase()
      const filtered = allUsers.filter((user: User) => 
        user && 
        user.name && 
        user._id &&
        user.name.toLowerCase().includes(searchTerm) && 
        user._id !== user?.userId
      )
      
      setUserSuggestions(filtered)
      setShowUserSuggestions(true)
      setSelectedSuggestionIndex(0)
    } else {
      setShowUserSuggestions(false)
    }
  }

  const insertUserMention = (user: User) => {
    if (!user || !user.name) return
    
    const beforeCursor = newNote.substring(0, cursorPosition)
    const afterCursor = newNote.substring(cursorPosition)
    const atIndex = beforeCursor.lastIndexOf('@')
    const beforeAt = newNote.substring(0, atIndex)
    
    const newText = `${beforeAt}@${user.name} ${afterCursor}`
    setNewNote(newText)
    setShowUserSuggestions(false)
    
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = beforeAt.length + user.name.length + 2
        textareaRef.current.setSelectionRange(newPosition, newPosition)
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleAddNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setLoadingNote(true)
    setError(null)
    
    try {
      const res = await axios.post<Note>(
        `http://localhost:5000/api/notes/${id}/notes`, 
        { content: newNote.trim() },
        axiosConfig
      )
      
      setNewNote('')      
    } catch (err: unknown) {
      console.error('Error adding note:', err)
      
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error
        setError(errorMessage)
        
        if (err.response?.status === 401) {
          router.push('/login')
        }
      } else {
        setError('Failed to add note')
      }
    } finally {
      setLoadingNote(false)
    }
  }

  const renderNoteContent = (content: string) => {
    return content.split(/(@\w+)/g).map((part: string, index: number) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  if (!user || !token) return null

  if (!candidate && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading candidate...</p>
      </div>
    )
  }

  if (error && !candidate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">{candidate?.name}</h1>
          </div>
          <p className="text-gray-500">{candidate?.email}</p>
        </div>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Collaborative Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <form onSubmit={handleAddNote} className="flex items-start space-x-2">
                <div className="flex-grow relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Write a note... (use @username to mention)"
                    value={newNote}
                    onChange={handleNoteChange}
                    className="flex-grow"
                    rows={2}
                    disabled={loadingNote}
                  />
                  
                  {showUserSuggestions && userSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                      {userSuggestions.map((user: User, index: number) => (
                        <div
                          key={user._id}
                          className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
                            index === selectedSuggestionIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => insertUserMention(user)}
                        >
                          <span>{user.name}</span>
                          <span className="text-sm text-gray-400">({user.email || 'No email'})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Button type="submit" disabled={loadingNote || !newNote.trim()} className="self-end">
                  <Send className="w-4 h-4 mr-2" />
                  {loadingNote ? 'Sending...' : 'Send'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {fetchingNotes ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading notes...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No notes yet. Start the discussion above.</p>
            </div>
          ) : (
            notes.map((note: Note) => (
              <Card key={note._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <p className="font-medium text-sm text-gray-600 mb-1">
                        {note.authorId?.name || note.authorName || 'Unknown'}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">
                        {renderNoteContent(note.content)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 ml-4 flex-shrink-0">
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}