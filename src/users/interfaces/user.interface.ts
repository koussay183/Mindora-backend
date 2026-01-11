export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: Date;
  hasCompletedQuiz: boolean;
  quizToken?: string; // Reference to their quiz result
}
