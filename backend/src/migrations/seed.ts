import QuestionModel from '../models/Question';
import { hashAnswer } from '../services/questionService';
import { redisClient, cacheKeys } from '../redis';

/**
 * Seed database with sample questions
 */
const sampleQuestions = [
  // Difficulty 1
  {
    difficulty: 1,
    prompt: 'What is 2 + 2?',
    choices: ['3', '4', '5', '6'],
    correctAnswer: '4',
    tags: ['math', 'basic'],
  },
  
  
  // Difficulty 2
  {
    difficulty: 2,
    prompt: 'What is 15 × 3?',
    choices: ['40', '45', '50', '55'],
    correctAnswer: '45',
    tags: ['math'],
  },
  
  
  // Difficulty 3
  {
    difficulty: 3,
    prompt: 'What is the square root of 144?',
    choices: ['10', '11', '12', '13'],
    correctAnswer: '12',
    tags: ['math'],
  },
  
  
  // Difficulty 4
  {
    difficulty: 4,
    prompt: 'What is the chemical symbol for Gold?',
    choices: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 'Au',
    tags: ['chemistry'],
  },
  
  
  // Difficulty 5
  {
    difficulty: 5,
    prompt: 'What is the derivative of x²?',
    choices: ['x', '2x', 'x²', '2x²'],
    correctAnswer: '2x',
    tags: ['calculus'],
  },
  // lty 6
  {
    difficulty: 6,
    prompt: 'What is the time complexity of binary search?',
    choices: ['O(n)', 'O(log n)', 'O(n log n)', 'O(n²)'],
    correctAnswer: 'O(log n)',
    tags: ['algorithms'],
  },
  
  
  // Difficulty 7
 
  {
    difficulty: 7,
    prompt: 'What is the largest prime number less than 100?',
    choices: ['91', '93', '97', '99'],
    correctAnswer: '97',
    tags: ['math'],
  },
  
  // Difficulty 8
  {
    difficulty: 8,
    prompt: 'What is the Heisenberg Uncertainty Principle?',
    choices: [
      'You cannot know both position and momentum exactly',
      'Energy cannot be created or destroyed',
      'Light behaves as both wave and particle',
      'Every action has an equal reaction'
    ],
    correctAnswer: 'You cannot know both position and momentum exactly',
    tags: ['physics'],
  },
  
  
  // Difficulty 9

  {
    difficulty: 9,
    prompt: 'Who discovered the structure of DNA?',
    choices: [
      'Marie Curie',
      'Watson, Crick, and Franklin',
      'Charles Darwin',
      'Louis Pasteur'
    ],
    correctAnswer: 'Watson, Crick, and Franklin',
    tags: ['biology'],
  },
  
  // Difficulty 10
  {
    difficulty: 10,
    prompt: 'What is the Church-Turing Thesis?',
    choices: [
      'Computability via Turing machines equals lambda calculus',
      'All powerful computing models are equivalent',
      'Effective computability can be formalized',
      'All of the above'
    ],
    correctAnswer: 'All of the above',
    tags: ['computer-science'],
  },
];

export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

      // Replace entire questions collection so deleted questions are removed
      await QuestionModel.deleteMany({});

      // Clear all question cache from Redis
      for (let difficulty = 1; difficulty <= 10; difficulty++) {
        const cacheKey = cacheKeys.questionPool(difficulty);
        await redisClient.del(cacheKey);
      }

      const docs = sampleQuestions.map((q) => ({
        difficulty: q.difficulty,
        prompt: q.prompt,
        choices: q.choices,
        correctAnswerHash: hashAnswer(q.correctAnswer),
        tags: q.tags,
      }));

      const insertedDocs = await QuestionModel.insertMany(docs);
      console.log(`✅ Seeded ${insertedDocs.length} questions`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  import('../db').then(async ({ connectDatabase }) => {
    await connectDatabase();
    await redisClient.connect();
    await seedDatabase();
    await redisClient.quit();
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
