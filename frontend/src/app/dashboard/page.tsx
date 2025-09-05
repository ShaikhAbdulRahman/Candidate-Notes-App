'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/app/contexts/AuthContext'
import { useSocket } from '@/app/contexts/SocketContext'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'
import { Badge } from '@/components/ui/Badge'
import { Plus, Users, Bell, MessageSquare, LogOut, BellRing, CheckCircle } from 'lucide-react'

interface Candidate {
  _id: string
  name: string
  email: string
}

interface Notification {
  _id: string
  noteId: string
  candidateId: string
  candidateName: string
  message: string
  isRead: boolean
  createdAt: string
}

interface NewCandidate {
  name: string
  email: string
}

export default function Dashboard() {
  const { user, logout, token, loading } = useAuth()
  const { socket } = useSocket()
  const router = useRouter()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [newCandidate, setNewCandidate] = useState<NewCandidate>({ name: '', email: '' })
  const [loadingState, setLoadingState] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notificationError, setNotificationError] = useState<string | null>(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  const axiosConfig = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.push('/login')
      return
    }
    
    fetchCandidates()
    fetchNotifications()
  }, [user, loading, router])

  useEffect(() => {
    if (socket && user) {
      const handleNotification = (notification: Notification) => {
        setNotifications((prev: Notification[]) => {
          const exists = prev.some((n: Notification) => 
            n.noteId === notification.noteId && n.candidateId === notification.candidateId
          )
          if (exists) return prev
          return [notification, ...prev]
        })
        
        if (Notification.permission === 'granted') {
          new Notification(`Tagged in ${notification.candidateName}`, {
            body: notification.message,
            icon: '/favicon.ico'
          })
        }
      }

      socket.on(`notification-${user.id}`, handleNotification)
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }

      return () => {
        socket.off(`notification-${user.id}`, handleNotification)
      }
    }
  }, [socket, user])

  const fetchCandidates = async () => {
    if (loadingCandidates) return
    setLoadingCandidates(true)

    try {
      const response = await axios.get<Candidate[]>('http://localhost:5000/api/candidates', axiosConfig)
      setCandidates(response.data)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoadingCandidates(false)
    }
  }

  const fetchNotifications = async () => {
    try {
      setNotificationError(null)
      const response = await axios.get<Notification[]>('http://localhost:5000/api/notifications', axiosConfig)
      setNotifications(response.data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotificationError('Failed to load notifications')
    }
  }

  const handleCreateCandidate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoadingState(true)

    try {
      const response = await axios.post<Candidate>('http://localhost:5000/api/candidates', newCandidate, axiosConfig)
      setCandidates([response.data, ...candidates])
      setNewCandidate({ name: '', email: '' })
      setDialogOpen(false)
    } catch (error) {
      console.error('Error creating candidate:', error)
    } finally {
      setLoadingState(false)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await axios.patch(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, axiosConfig)
            setNotifications((prev: Notification[]) => 
        prev.map((n: Notification) => 
          n._id === notification._id ? { ...n, isRead: true } : n
        )
      )
            router.push(`/candidates/${notification.candidateId}`)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n: Notification) => !n.isRead)
      
      await Promise.all(
        unreadNotifications.map((notification: Notification) =>
          axios.patch(`http://localhost:5000/api/notifications/${notification._id}/read`, {}, axiosConfig)
        )
      )
        setNotifications((prev: Notification[]) => prev.map((n: Notification) => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }
  if (!user) return null

  const unreadNotifications = notifications.filter((n: Notification) => !n.isRead)
  const hasUnreadNotifications = unreadNotifications.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {hasUnreadNotifications && (
                <div className="relative">
                  <BellRing className="w-6 h-6 text-orange-500 animate-pulse" />
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 px-2 py-1 text-xs"
                  >
                    {unreadNotifications.length}
                  </Badge>
                </div>
              )}
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidates Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Candidates
                    </CardTitle>
                    <CardDescription>
                      Manage and collaborate on candidate evaluations
                    </CardDescription>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Candidate
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Candidate</DialogTitle>
                        <DialogDescription>
                          Create a new candidate profile for evaluation
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCandidate} className="space-y-4">
                        <div>
                          <Label htmlFor="candidate-name">Full Name</Label>
                          <Input
                            id="candidate-name"
                            value={newCandidate.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setNewCandidate({ ...newCandidate, name: e.target.value })
                            }
                            placeholder="Enter candidate's full name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="candidate-email">Email Address</Label>
                          <Input
                            id="candidate-email"
                            type="email"
                            value={newCandidate.email}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setNewCandidate({ ...newCandidate, email: e.target.value })
                            }
                            placeholder="Enter candidate's email"
                            required
                          />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={loadingState}>
                            {loadingState ? 'Creating...' : 'Create Candidate'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {candidates.length === 0 ? (
                  <p className="text-muted-foreground">No candidates yet. Add one above.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {candidates.map((candidate: Candidate) => (
                      <li
                        key={candidate._id}
                        className="py-3 flex justify-between items-center hover:bg-muted/50 px-2 rounded-md cursor-pointer"
                        onClick={() => router.push(`/candidates/${candidate._id}`)}
                      >
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        </div>
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notifications Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <Bell className="w-5 h-5 mr-2" />
                      Notifications
                      {hasUnreadNotifications && (
                        <Badge variant="destructive" className="ml-2">
                          {unreadNotifications.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Stay up-to-date on mentions and updates
                    </CardDescription>
                  </div>
                  {hasUnreadNotifications && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notificationError && (
                  <div className="text-red-500 text-sm mb-3 p-2 bg-red-50 rounded">
                    {notificationError}
                  </div>
                )}
                
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-muted-foreground">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      You'll see mentions and updates here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {notifications.map((notification: Notification) => (
                      <div
                        key={notification._id || `${notification.noteId}-${notification.candidateId}`}
                        className={`p-3 rounded-md cursor-pointer transition-colors border ${
                          notification.isRead 
                            ? 'bg-white border-gray-100 hover:bg-gray-50' 
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm truncate">
                                {notification.candidateName}
                              </p>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notification.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}