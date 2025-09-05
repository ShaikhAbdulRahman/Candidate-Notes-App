'use client'

import { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import axios from 'axios'

type User = {
  _id: string
  name: string
  email: string
}

interface TaggedTextareaProps {
  value: string
  onChange: (e: { target: { value: string } }) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  token?: string
}

const TaggedTextarea = ({
  value,
  onChange,
  placeholder,
  disabled,
  rows = 2,
  token,
}: TaggedTextareaProps) => {
  const [users, setUsers] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [currentTag, setCurrentTag] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get<User[]>('http://localhost:5000/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUsers(response.data)
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    if (token) {
      fetchUsers()
    }
  }, [token])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    onChange({ target: { value: newValue } })
    setCursorPosition(cursorPos)

    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1)

      if (!textAfterAt.includes(' ') && textAfterAt.length >= 0) {
        setCurrentTag(textAfterAt)

        const filteredSuggestions = users.filter((user) =>
          user.name.toLowerCase().startsWith(textAfterAt.toLowerCase())
        )

        setSuggestions(filteredSuggestions)
        setShowSuggestions(filteredSuggestions.length > 0)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (user: User) => {
    const textBeforeCursor = value.slice(0, cursorPosition)
    const textAfterCursor = value.slice(cursorPosition)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

    const newText =
      textBeforeCursor.slice(0, lastAtSymbol + 1) + user.name + ' ' + textAfterCursor

    onChange({ target: { value: newText } })
    setShowSuggestions(false)

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = lastAtSymbol + user.name.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && e.key === 'Escape') {
      setShowSuggestions(false)
      e.preventDefault()
    }
  }

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200)
  }

  const renderHighlightedText = (text: string) => {
    if (!text) return null

    const tagRegex = /@([a-zA-Z0-9_-]+)/g
    const parts = text.split(tagRegex)

    return parts.map((part: string, index: number) => {
      if (index % 2 === 1) {
        const isValidUser = users.some(
          (user) => user.name.toLowerCase() === part.toLowerCase()
        )
        return (
          <span
            key={index}
            className={isValidUser ? 'text-blue-600 font-medium' : 'text-red-500'}
          >
            @{part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        rows={rows}
        className="resize-none"
      />

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((user) => (
            <div
              key={user._id}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              onMouseDown={() => handleSuggestionClick(user)}
            >
              <div className="font-medium">@{user.name}</div>
              <div className="text-gray-500 text-xs">{user.email}</div>
            </div>
          ))}
        </div>
      )}

      {value && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 border-l-4 border-blue-200">
          <div className="text-xs text-gray-500 mb-1">Preview:</div>
          <div>{renderHighlightedText(value)}</div>
        </div>
      )}
    </div>
  )
}

export default TaggedTextarea
