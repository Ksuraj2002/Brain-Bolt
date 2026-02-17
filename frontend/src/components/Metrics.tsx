'use client'

import { useEffect, useState } from 'react'
import { getMetrics, type Metrics } from '@/lib/api'
import { usePolling } from '@/hooks/usePolling'
import { TrendingUp, Target, Award } from 'lucide-react'

interface MetricsProps {
  userId: string
}

export function Metrics({ userId }: MetricsProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMetrics = async () => {
    try {
      const data = await getMetrics(userId)
      setMetrics(data)
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [userId])

  // Poll for updates every 10 seconds
  usePolling(loadMetrics, 10000)

  if (loading || !metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Target className="w-5 h-5" />
        Your Metrics
      </h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">Total Score</span>
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {metrics.totalScore.toFixed(0)}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
            {metrics.streak}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Award className="w-4 h-4" />
            Max Streak
          </span>
          <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {metrics.maxStreak}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Accuracy
          </span>
          <span className="text-xl font-bold text-green-600 dark:text-green-400">
            {(metrics.accuracy * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">Difficulty</span>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {metrics.currentDifficulty}/10
          </span>
        </div>
      </div>
    </div>
  )
}
