'use client'

import { useState, useEffect, useCallback } from 'react'
import { QuestionCard } from './QuestionCard'
import { getNextQuestion, submitAnswer, type Question, type AnswerResponse } from '@/lib/api'

interface QuizContainerProps {
  userId: string
}

export function QuizContainer({ userId }: QuizContainerProps) {
  const [question, setQuestion] = useState<Question | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastAnswer, setLastAnswer] = useState<AnswerResponse | null>(null)

  const loadQuestion = useCallback(async () => {
    try {
      setLoading(true)
      const nextQuestion = await getNextQuestion(userId, sessionId || undefined)
      setQuestion(nextQuestion)
      if (!sessionId) {
        setSessionId(nextQuestion.sessionId)
      }
    } catch (error) {
      console.error('Error loading question:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, sessionId])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  const handleAnswer = async (answer: string) => {
    if (!question || submitting) return

    setSubmitting(true)
    try {
      const response = await submitAnswer(
        userId,
        sessionId!,
        question.questionId,
        answer,
        question.stateVersion
      )
      setLastAnswer(response)
      
      // Load next question after a short delay
      setTimeout(() => {
        setLastAnswer(null)
        loadQuestion()
      }, 2000)
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !question) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No questions available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <QuestionCard
        question={question}
        onAnswer={handleAnswer}
        disabled={submitting}
        lastAnswer={lastAnswer}
      />
    </div>
  )
}
