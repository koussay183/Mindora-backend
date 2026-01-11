import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase Service
 * 
 * Manages Firebase Admin SDK initialization and provides access to Firestore.
 * This service is responsible for establishing the connection to Firebase
 * and ensuring proper configuration during application startup.
 */
@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private db: admin.firestore.Firestore;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize Firebase Admin SDK on module initialization
   * Uses service account credentials from environment variables
   */
  async onModuleInit() {
    try {
      const projectId = this.configService.get<string>('firebase.projectId');
      const privateKey = this.configService.get<string>('firebase.privateKey');
      const clientEmail = this.configService.get<string>(
        'firebase.clientEmail',
      );

      if (!projectId || !privateKey || !clientEmail) {
        throw new Error(
          'Firebase configuration is incomplete. Please check your environment variables.',
        );
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });

      this.db = admin.firestore();
      this.logger.log('Firebase initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error.stack);
      throw error;
    }
  }

  /**
   * Get Firestore database instance
   * @returns Firestore database instance
   */
  getFirestore(): admin.firestore.Firestore {
    return this.db;
  }
}
