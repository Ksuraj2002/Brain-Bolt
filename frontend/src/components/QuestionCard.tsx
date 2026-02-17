'use client'

import { useState } from 'react'
import { type Question, type AnswerResponse } from '@/lib/api'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface QuestionCardProps {
  question: Question
  onAnswer: (answer: string) => void
  disabled: boolean
  lastAnswer: AnswerResponse | null
}

export function QuestionCard({ question, onAnswer, disabled, lastAnswer }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)

  const handleSelect = (choice: string) => {
    if (disabled || lastAnswer) return
    setSelectedAnswer(choice)
    onAnswer(choice)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (difficulty <= 6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-medium p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getDifficultyColor(question.difficulty)}`}>
            Difficulty: {question.difficulty}/10
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Score: {question.currentScore.toFixed(0)}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Streak: {question.currentStreak}
          </span>
        </div>
      </div>

      {/* Question */}
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        {question.prompt}
      </h2>

      {/* Answer Feedback */}
      {lastAnswer && (
        <div className={`mb-6 p-4 rounded-xl ${
          lastAnswer.correct
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {lastAnswer.correct ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className={`font-semibold ${
              lastAnswer.correct
                ? 'text-green-800 dark:text-green-200'
                : 'text-red-800 dark:text-red-200'
            }`}>
              {lastAnswer.correct ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {lastAnswer.correct && (
              <span>+{lastAnswer.scoreDelta.toFixed(0)} points</span>
            )}
            {lastAnswer.correct && (
              <span className="ml-4">New difficulty: {lastAnswer.newDifficulty}/10</span>
            )}
            {!lastAnswer.correct && (
              <span>Difficulty adjusted to: {lastAnswer.newDifficulty}/10</span>
            )}
          </div>
        </div>
      )}

      {/* Choices */}
      <div className="space-y-3">
        {question.choices.map((choice, index) => {
          const isSelected = selectedAnswer === choice
          const isCorrect = lastAnswer?.correct && isSelected
          const isIncorrect = lastAnswer && !lastAnswer.correct && isSelected

          return (
            <button
              key={index}
              onClick={() => handleSelect(choice)}
              disabled={disabled || !!lastAnswer}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-400'
                  : isIncorrect
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500 dark:border-red-400'
                  : isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 dark:border-primary-400'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600'
              } ${disabled || lastAnswer ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg text-gray-900 dark:text-gray-100">{choice}</span>
                {disabled && isSelected && !lastAnswer && (
                  <Loader2 className="w-5 h-5 text-primary-600 dark:text-primary-400 animate-spin" />
                )}
                {isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                )}
                {isIncorrect && (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
