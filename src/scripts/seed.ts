import * as admin from 'firebase-admin';
import { config } from 'dotenv';

/**
 * Seed Script for Personality Quiz
 * 
 * This script populates Firestore with:
 * - 4 personality types
 * - 10 product-style personality questions
 * - Answer options with weighted scoring
 * 
 * Run: npm run seed
 */

// Load environment variables
config();

// Initialize Firebase Admin
const initializeFirebase = () => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error('Missing Firebase configuration. Check your .env file.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  });

  return admin.firestore();
};

// Personality definitions
const personalities = [
  {
    id: 'architect',
    name: 'The Architect',
    description:
      'You are logical and structured, preferring to plan ahead and think through every detail. Your analytical mind excels at identifying patterns and creating systematic solutions. You value clarity, precision, and well-organized approaches to challenges.',
    traits: [
      'Analytical thinker',
      'Strategic planner',
      'Detail-oriented',
      'Methodical approach',
      'Values structure',
    ],
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description:
      'You are curious and flexible, thriving on new experiences and creative solutions. Your adaptable nature allows you to pivot quickly and embrace uncertainty. You value innovation, spontaneity, and discovering unconventional paths forward.',
    traits: [
      'Curious and open-minded',
      'Adaptable',
      'Creative problem-solver',
      'Embraces change',
      'Innovative thinking',
    ],
  },
  {
    id: 'supporter',
    name: 'The Supporter',
    description:
      'You are empathetic and team-focused, finding strength in collaboration and connection. Your ability to understand others makes you an excellent communicator and mediator. You value harmony, collective success, and building strong relationships.',
    traits: [
      'Empathetic listener',
      'Team player',
      'Strong communicator',
      'Values collaboration',
      'Relationship builder',
    ],
  },
  {
    id: 'leader',
    name: 'The Leader',
    description:
      'You are decisive and confident, naturally taking charge and driving results. Your action-oriented mindset helps teams move forward quickly and efficiently. You value accountability, clear direction, and achieving tangible outcomes.',
    traits: [
      'Decisive decision-maker',
      'Takes initiative',
      'Results-driven',
      'Confident communicator',
      'Natural motivator',
    ],
  },
];

// Quiz questions with weighted scoring
const questions = [
  {
    id: 'q1',
    text: 'When starting a new project, you usually...',
    weight: 4,
    order: 1,
    options: [
      {
        id: 'a',
        text: 'Create a detailed plan before taking any action',
        scores: { architect: 3, leader: 1 },
      },
      {
        id: 'b',
        text: 'Jump in and figure things out as you go',
        scores: { explorer: 3, leader: 1 },
      },
      {
        id: 'c',
        text: 'Discuss the approach with your team first',
        scores: { supporter: 3, architect: 1 },
      },
      {
        id: 'd',
        text: 'Take immediate action and adjust based on results',
        scores: { leader: 3, explorer: 1 },
      },
    ],
  },
  {
    id: 'q2',
    text: 'In a group discussion, you tend to...',
    weight: 3,
    order: 2,
    options: [
      {
        id: 'a',
        text: 'Listen carefully and synthesize different viewpoints',
        scores: { supporter: 3, architect: 1 },
      },
      {
        id: 'b',
        text: 'Propose structured frameworks to organize ideas',
        scores: { architect: 3 },
      },
      {
        id: 'c',
        text: 'Challenge assumptions and suggest alternatives',
        scores: { explorer: 2, leader: 1 },
      },
      {
        id: 'd',
        text: 'Drive toward decisions and next steps',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q3',
    text: 'When facing uncertainty, you prefer to...',
    weight: 5,
    order: 3,
    options: [
      {
        id: 'a',
        text: 'Analyze all available data before proceeding',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Experiment with different approaches',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Seek input and support from others',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Make a decision and take responsibility',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q4',
    text: 'Your ideal work environment is one where...',
    weight: 2,
    order: 4,
    options: [
      {
        id: 'a',
        text: 'Processes are clear and well-documented',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Creativity and experimentation are encouraged',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'People collaborate and support each other',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Goals are ambitious and results-focused',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q5',
    text: 'When a deadline is approaching, you typically...',
    weight: 4,
    order: 5,
    options: [
      {
        id: 'a',
        text: 'Follow your original plan and timeline',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Adapt your approach based on what is working',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Rally the team and ensure everyone is aligned',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Focus intensely and push to complete the work',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q6',
    text: 'When learning something new, you prefer to...',
    weight: 3,
    order: 6,
    options: [
      {
        id: 'a',
        text: 'Study the fundamentals and build a solid foundation',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Try things hands-on and learn from mistakes',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Learn alongside others in a group setting',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Focus on what you need to know to achieve results',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q7',
    text: 'When giving feedback to a colleague, you...',
    weight: 3,
    order: 7,
    options: [
      {
        id: 'a',
        text: 'Provide specific, objective observations',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Suggest creative alternatives they might not have considered',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Focus on understanding their perspective first',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Be direct about what needs to change',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q8',
    text: 'During a brainstorming session, you are most likely to...',
    weight: 2,
    order: 8,
    options: [
      {
        id: 'a',
        text: 'Evaluate ideas for feasibility and structure',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Generate many diverse possibilities',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Build on others ideas and find common ground',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Push the group toward actionable solutions',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q9',
    text: 'When something goes wrong, your first instinct is to...',
    weight: 5,
    order: 9,
    options: [
      {
        id: 'a',
        text: 'Investigate the root cause systematically',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Try a different approach immediately',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Check in with the team and assess impact',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Take ownership and fix it quickly',
        scores: { leader: 3 },
      },
    ],
  },
  {
    id: 'q10',
    text: 'Your approach to problem-solving is best described as...',
    weight: 4,
    order: 10,
    options: [
      {
        id: 'a',
        text: 'Methodical and evidence-based',
        scores: { architect: 3 },
      },
      {
        id: 'b',
        text: 'Exploratory and iterative',
        scores: { explorer: 3 },
      },
      {
        id: 'c',
        text: 'Collaborative and consensus-driven',
        scores: { supporter: 3 },
      },
      {
        id: 'd',
        text: 'Swift and action-oriented',
        scores: { leader: 3 },
      },
    ],
  },
];

// Seed the database
const seedDatabase = async () => {
  console.log('Starting database seed...');

  try {
    const db = initializeFirebase();

    // Seed personalities
    console.log('Seeding personalities...');
    const batch = db.batch();

    for (const personality of personalities) {
      const docRef = db.collection('personalities').doc(personality.id);
      batch.set(docRef, personality);
    }

    await batch.commit();
    console.log(`✓ Seeded ${personalities.length} personalities`);

    // Seed questions
    console.log('Seeding questions...');
    const questionBatch = db.batch();

    for (const question of questions) {
      const docRef = db.collection('questions').doc(question.id);
      questionBatch.set(docRef, question);
    }

    await questionBatch.commit();
    console.log(`✓ Seeded ${questions.length} questions`);

    console.log('\nDatabase seed completed successfully!');
    console.log('\nSummary:');
    console.log(`- Personalities: ${personalities.length}`);
    console.log(`- Questions: ${questions.length}`);
    console.log(
      `- Total answer options: ${questions.reduce((sum, q) => sum + q.options.length, 0)}`,
    );

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();
