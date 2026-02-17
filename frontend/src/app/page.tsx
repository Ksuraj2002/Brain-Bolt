'use client'

import { useEffect, useState } from 'react'
import { QuizContainer } from '@/components/QuizContainer'
import { Leaderboard } from '@/components/Leaderboard'
import { Metrics } from '@/components/Metrics'
import { Header } from '@/components/Header'

export default function Home() {
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('userId')
      if (stored) return stored
      const newId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('userId', newId)
      return newId
    }
    return `user-${Date.now()}`
  })

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header userId={userId} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QuizContainer userId={userId} />
          </div>
          <div className="space-y-6">
            <Metrics userId={userId} />
            <Leaderboard userId={userId} />
          </div>
        </div>
      </div>
    </main>
  )
}
