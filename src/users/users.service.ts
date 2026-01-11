import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { User } from './interfaces/user.interface';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

@Injectable()
export class UsersService {
  private readonly usersCollection = 'users';

  constructor(private readonly firebaseService: FirebaseService) {}

  async createUser(email: string, password: string, name: string): Promise<User> {
    const db = this.firebaseService.getFirestore();

    // Check if user already exists
    const existingUserSnapshot = await db
      .collection(this.usersCollection)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = nanoid();
    const user: User = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
      hasCompletedQuiz: false,
    };

    await db.collection(this.usersCollection).doc(userId).set({
      id: user.id,
      email: user.email,
      password: user.password,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      hasCompletedQuiz: user.hasCompletedQuiz,
    });

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const db = this.firebaseService.getFirestore();
    const snapshot = await db
      .collection(this.usersCollection)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: data.id,
      email: data.email,
      password: data.password,
      name: data.name,
      createdAt: new Date(data.createdAt),
      hasCompletedQuiz: data.hasCompletedQuiz || false,
      quizToken: data.quizToken,
    };
  }

  async findById(userId: string): Promise<User | null> {
    const db = this.firebaseService.getFirestore();
    const doc = await db.collection(this.usersCollection).doc(userId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    if (!data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      password: data.password,
      name: data.name,
      createdAt: new Date(data.createdAt),
      hasCompletedQuiz: data.hasCompletedQuiz || false,
      quizToken: data.quizToken,
    };
  }

  async markQuizCompleted(userId: string, quizToken: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    await db.collection(this.usersCollection).doc(userId).update({
      hasCompletedQuiz: true,
      quizToken,
    });
  }

  async hasCompletedQuiz(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.hasCompletedQuiz;
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
