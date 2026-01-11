import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

/**
 * Firebase Module
 * 
 * Global module that provides Firebase services throughout the application.
 * The @Global decorator makes this module available everywhere without
 * needing to import it in each feature module.
 */
@Global()
@Module({
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
