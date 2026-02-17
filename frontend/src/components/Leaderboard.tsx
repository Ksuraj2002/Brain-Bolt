'use client'

import { useEffect, useState } from 'react'
import { getScoreLeaderboard, getStreakLeaderboard, type LeaderboardEntry } from '@/lib/api'
import { usePolling } from '@/hooks/usePolling'
import { Trophy, Flame } from 'lucide-react'

interface LeaderboardProps {
  userId: string
}

export function Leaderboard({ userId }: LeaderboardProps) {
  const [scoreLeaderboard, setScoreLeaderboard] = useState<LeaderboardEntry[]>([])
  const [streakLeaderboard, setStreakLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userScoreRank, setUserScoreRank] = useState<number | null>(null)
  const [userStreakRank, setUserStreakRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'score' | 'streak'>('score')

  const loadLeaderboards = async () => {
    try {
      const [scoreData, streakData] = await Promise.all([
        getScoreLeaderboard(userId, 10),
        getStreakLeaderboard(userId, 10),
      ])
      setScoreLeaderboard(scoreData.leaderboard)
      setStreakLeaderboard(streakData.leaderboard)
      setUserScoreRank(scoreData.userRank)
      setUserStreakRank(streakData.userRank)
    } catch (error) {
      console.error('Error loading leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboards()
  }, [userId])

  // Poll for updates every 5 seconds
  usePolling(loadLeaderboards, 5000)

  const currentLeaderboard = activeTab === 'score' ? scoreLeaderboard : streakLeaderboard
  const userRank = activeTab === 'score' ? userScoreRank : userStreakRank

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <Trophy className="w-5 h-5" />
        Leaderboard
      </h3>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('score')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'score'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Score
        </button>
        <button
          onClick={() => setActiveTab('streak')}
          className={`px-4 py-2 font-semibold transition-colors flex items-center gap-1 ${
            activeTab === 'streak'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          Streak
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {currentLeaderboard.map((entry, index) => {
            const isCurrentUser = entry.userId === userId
            return (
              <div
                key={entry.userId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500 dark:border-primary-400'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-8 text-center ${
                    index === 0
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : index === 1
                      ? 'text-gray-500 dark:text-gray-400'
                      : index === 2
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    #{entry.rank}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {entry.userId.slice(0, 8)}...
                  </span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {activeTab === 'score'
                    ? entry.totalScore?.toFixed(0) || 0
                    : entry.maxStreak || 0}
                </span>
              </div>
            )
          })}

          {userRank !== null && !currentLeaderboard.some((e) => e.userId === userId) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-500 dark:border-primary-400">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary-600 dark:text-primary-400">
                    #{userRank}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">You</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
