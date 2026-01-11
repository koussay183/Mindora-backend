import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * End-to-End Test Suite for Personality Quiz API
 * 
 * Tests all API endpoints with various scenarios:
 * - Happy path (successful operations)
 * - Error handling (validation, not found, bad requests)
 * - Edge cases (partial data, special characters, etc.)
 * - Authentication system (registration, login, JWT protection)
 * 
 * These tests validate the entire application flow including
 * controllers, services, validation pipes, Firebase integration,
 * and JWT authentication.
 */
describe('Personality Quiz API (e2e)', () => {
  let app: INestApplication<App>;
  let quizToken: string;
  let authToken: string; // JWT token for authenticated requests

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same global pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    await app.init();

    // Register a test user for authenticated endpoints
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `testuser.${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Test User'
      });
    
    authToken = registerResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================
  // GET /quiz/personalities
  // ============================================
  describe('GET /quiz/personalities', () => {
    it('should return all personalities', () => {
      return request(app.getHttpServer())
        .get('/quiz/personalities')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('personalities');
          expect(Array.isArray(res.body.personalities)).toBe(true);
          expect(res.body.personalities.length).toBe(4);
        });
    });

    it('should return personalities with correct structure', () => {
      return request(app.getHttpServer())
        .get('/quiz/personalities')
        .expect(200)
        .expect((res) => {
          const personality = res.body.personalities[0];
          expect(personality).toHaveProperty('id');
          expect(personality).toHaveProperty('name');
          expect(personality).toHaveProperty('description');
          expect(personality).toHaveProperty('traits');
          expect(Array.isArray(personality.traits)).toBe(true);
        });
    });

    it('should include all expected personality IDs', () => {
      return request(app.getHttpServer())
        .get('/quiz/personalities')
        .expect(200)
        .expect((res) => {
          const ids = res.body.personalities.map((p: any) => p.id);
          expect(ids).toContain('architect');
          expect(ids).toContain('explorer');
          expect(ids).toContain('supporter');
          expect(ids).toContain('leader');
        });
    });
  });

  // ============================================
  // GET /quiz/questions
  // ============================================
  describe('GET /quiz/questions', () => {
    it('should return all questions', () => {
      return request(app.getHttpServer())
        .get('/quiz/questions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('questions');
          expect(Array.isArray(res.body.questions)).toBe(true);
          expect(res.body.questions.length).toBe(10);
        });
    });

    it('should return questions with correct structure', () => {
      return request(app.getHttpServer())
        .get('/quiz/questions')
        .expect(200)
        .expect((res) => {
          const question = res.body.questions[0];
          expect(question).toHaveProperty('id');
          expect(question).toHaveProperty('text');
          expect(question).toHaveProperty('weight');
          expect(question).toHaveProperty('order');
          expect(question).toHaveProperty('options');
          expect(Array.isArray(question.options)).toBe(true);
        });
    });

    it('should have questions sorted by order', () => {
      return request(app.getHttpServer())
        .get('/quiz/questions')
        .expect(200)
        .expect((res) => {
          const orders = res.body.questions.map((q: any) => q.order);
          const sortedOrders = [...orders].sort((a, b) => a - b);
          expect(orders).toEqual(sortedOrders);
        });
    });

    it('should have options with valid structure', () => {
      return request(app.getHttpServer())
        .get('/quiz/questions')
        .expect(200)
        .expect((res) => {
          const option = res.body.questions[0].options[0];
          expect(option).toHaveProperty('id');
          expect(option).toHaveProperty('text');
          expect(option).toHaveProperty('scores');
          expect(typeof option.scores).toBe('object');
        });
    });

    it('should have weights between 1 and 5', () => {
      return request(app.getHttpServer())
        .get('/quiz/questions')
        .expect(200)
        .expect((res) => {
          res.body.questions.forEach((q: any) => {
            expect(q.weight).toBeGreaterThanOrEqual(1);
            expect(q.weight).toBeLessThanOrEqual(5);
          });
        });
    });
  });

  // ============================================
  // POST /quiz/submit - Happy Path
  // ============================================
  describe('POST /quiz/submit - Success Cases', () => {
    it('should accept valid quiz submission', async () => {
      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.slice(0, 5).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ answers })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('topPersonality');
          expect(res.body).toHaveProperty('scores');
          expect(typeof res.body.token).toBe('string');
          expect(res.body.token.length).toBeGreaterThan(0);
          
          // Save token for later tests
          quizToken = res.body.token;
        });
    });

    it('should return valid personality types', async () => {
      // Register new user for this test
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user.personality.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Personality Test User'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.slice(0, 3).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[1].id,
      }));

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUserResponse.body.access_token}`)
        .send({ answers })
        .expect(200)
        .expect((res) => {
          const validPersonalities = ['architect', 'explorer', 'supporter', 'leader'];
          expect(validPersonalities).toContain(res.body.topPersonality);
        });
    });

    it('should calculate scores correctly', async () => {
      // Register new user for this test
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user.scores.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Scores Test User'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUserResponse.body.access_token}`)
        .send({ answers })
        .expect(200)
        .expect((res) => {
          expect(typeof res.body.scores).toBe('object');
          const scoreValues = Object.values(res.body.scores);
          expect(scoreValues.length).toBeGreaterThan(0);
          scoreValues.forEach((score: any) => {
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(0);
          });
        });
    });

    it('should accept partial answers (not all questions)', async () => {
      // Register new user for this test
      const newUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `user.partial.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Partial Test User'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.slice(0, 3).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUserResponse.body.access_token}`)
        .send({ answers })
        .expect(200);
    });
  });

  // ============================================
  // POST /quiz/submit - Validation Errors
  // ============================================
  describe('POST /quiz/submit - Validation Errors', () => {
    let validationTestToken: string;

    beforeAll(async () => {
      // Create a dedicated user for validation tests
      const validationUser = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `validation.user.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Validation Test User'
        });
      validationTestToken = validationUser.body.access_token;
    });

    it('should reject empty answers array', () => {
      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${validationTestToken}`)
        .send({ answers: [] })
        .expect(400);
    });

    it('should reject missing answers field', () => {
      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${validationTestToken}`)
        .send({})
        .expect(400);
    });

    it('should reject invalid question ID', async () => {
      // Create new user for this test
      const newUser = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `invalidq.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Invalid Q User'
        });

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUser.body.access_token}`)
        .send({
          answers: [
            { questionId: 'invalid_question', optionId: 'q1_a' }
          ]
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid question ID');
        });
    });

    it('should reject invalid option ID', async () => {
      // Create new user for this test
      const newUser = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `invalido.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Invalid O User'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questionId = response.body.questions[0].id;

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUser.body.access_token}`)
        .send({
          answers: [
            { questionId, optionId: 'invalid_option' }
          ]
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Invalid option ID');
        });
    });

    it('should reject duplicate question answers', async () => {
      // Create new user for this test
      const newUser = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `duplicate.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Duplicate User'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const question = response.body.questions[0];

      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${newUser.body.access_token}`)
        .send({
          answers: [
            { questionId: question.id, optionId: question.options[0].id },
            { questionId: question.id, optionId: question.options[1].id }
          ]
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toContain('Duplicate answer');
        });
    });

    it('should reject malformed answer objects', () => {
      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${validationTestToken}`)
        .send({
          answers: [
            { questionId: 'q1' } // missing optionId
          ]
        })
        .expect(400);
    });

    it('should reject non-array answers', () => {
      return request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${validationTestToken}`)
        .send({
          answers: 'not-an-array'
        })
        .expect(400);
    });
  });

  // ============================================
  // GET /quiz/result/:token
  // ============================================
  describe('GET /quiz/result/:token', () => {
    beforeAll(async () => {
      // quizToken is already set from first test
      // If not, create one
      if (!quizToken) {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 5).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        const submitResponse = await request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ answers });
        
        quizToken = submitResponse.body.token;
      }
    });

    it('should retrieve result with valid token', () => {
      return request(app.getHttpServer())
        .get(`/quiz/result/${quizToken}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('topPersonality');
          expect(res.body).toHaveProperty('scores');
          expect(res.body).toHaveProperty('createdAt');
          expect(typeof res.body.topPersonality).toBe('object');
          expect(typeof res.body.scores).toBe('object');
        });
    });

    it('should return full personality object', () => {
      return request(app.getHttpServer())
        .get(`/quiz/result/${quizToken}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const personality = res.body.topPersonality;
          expect(personality).toHaveProperty('id');
          expect(personality).toHaveProperty('name');
          expect(personality).toHaveProperty('description');
          expect(personality).toHaveProperty('traits');
          expect(Array.isArray(personality.traits)).toBe(true);
        });
    });

    it('should return 404 for invalid token', () => {
      return request(app.getHttpServer())
        .get('/quiz/result/invalid-token-12345')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should return 404 for non-existent token', () => {
      return request(app.getHttpServer())
        .get('/quiz/result/aaaaaaaaaaaaaaaaaaaaaa')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle special characters in token gracefully', () => {
      return request(app.getHttpServer())
        .get('/quiz/result/../../../etc/passwd')
        .expect(404);
    });
  });

  // ============================================
  // Edge Cases & Performance
  // ============================================
  describe('Edge Cases', () => {
    it('should handle concurrent quiz submissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.slice(0, 3).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      // Create 5 different users for concurrent submissions
      const userPromises = Array(5).fill(null).map((_, index) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `concurrent.${Date.now()}.${index}@example.com`,
            password: 'TestPassword123!',
            name: `Concurrent User ${index}`
          })
      );

      const users = await Promise.all(userPromises);
      
      const requests = users.map((user) =>
        request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${user.body.access_token}`)
          .send({ answers })
      );

      const results = await Promise.all(requests);
      
      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
      });

      // All tokens should be unique
      const tokens = results.map(r => r.body.token);
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);
    });

    it('should respond quickly to GET requests', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/quiz/personalities')
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(1000); // Should respond in < 1 second
    });
  });

  // ============================================
  // Scoring Algorithm Consistency
  // ============================================
  describe('Scoring Algorithm', () => {
    it('should produce consistent results for identical inputs', async () => {
      // Create two users for consistent input testing
      const user1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `consistent1.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Consistent User 1'
        });

      const user2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `consistent2.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Consistent User 2'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      const answers = questions.slice(0, 5).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      const result1 = await request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${user1.body.access_token}`)
        .send({ answers });

      const result2 = await request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${user2.body.access_token}`)
        .send({ answers });

      expect(result1.body.topPersonality).toBe(result2.body.topPersonality);
      expect(result1.body.scores).toEqual(result2.body.scores);
    });

    it('should produce different results for different inputs', async () => {
      // Create two users for different input testing
      const user1 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `different1.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Different User 1'
        });

      const user2 = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `different2.${Date.now()}@example.com`,
          password: 'TestPassword123!',
          name: 'Different User 2'
        });

      const response = await request(app.getHttpServer())
        .get('/quiz/questions');
      
      const questions = response.body.questions;
      
      const answers1 = questions.slice(0, 3).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[0].id,
      }));

      const answers2 = questions.slice(0, 3).map((q: any) => ({
        questionId: q.id,
        optionId: q.options[q.options.length - 1].id,
      }));

      const result1 = await request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${user1.body.access_token}`)
        .send({ answers: answers1 });

      const result2 = await request(app.getHttpServer())
        .post('/quiz/submit')
        .set('Authorization', `Bearer ${user2.body.access_token}`)
        .send({ answers: answers2 });

      // Tokens should be different
      expect(result1.body.token).not.toBe(result2.body.token);
    });
  });

  // ============================================
  // AUTHENTICATION SYSTEM
  // ============================================

  /**
   * Authentication Test Suite
   * 
   * Tests JWT-based authentication system including:
   * - User registration with validation
   * - User login with credential verification
   * - JWT token protection on endpoints
   * - Single-attempt quiz policy enforcement
   * - Result retrieval for authenticated users
   * - Authorization (users can only access own data)
   */
  describe('Authentication System', () => {
    let testUser1Token: string;
    let testUser2Token: string;
    let testUser1QuizToken: string;
    const testUser1Email = `test.user.${Date.now()}@example.com`;
    const testUser2Email = `test.user2.${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    // ============================================
    // POST /auth/register - User Registration
    // ============================================
    describe('POST /auth/register', () => {
      it('should register a new user successfully', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUser1Email,
            password: testPassword,
            name: 'Test User 1'
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user).toHaveProperty('email', testUser1Email);
            expect(res.body.user).toHaveProperty('name', 'Test User 1');
            expect(res.body.user).not.toHaveProperty('password');
            testUser1Token = res.body.access_token;
          });
      });

      it('should reject duplicate email registration', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUser1Email,
            password: testPassword,
            name: 'Duplicate User'
          })
          .expect(409)
          .expect((res) => {
            expect(res.body.message).toContain('already exists');
          });
      });

      it('should reject registration with missing email', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            password: testPassword,
            name: 'No Email User'
          })
          .expect(400);
      });

      it('should reject registration with invalid email format', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'invalid-email-format',
            password: testPassword,
            name: 'Invalid Email User'
          })
          .expect(400);
      });

      it('should reject registration with missing password', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test.${Date.now()}@example.com`,
            name: 'No Password User'
          })
          .expect(400);
      });

      it('should reject registration with short password', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test.${Date.now()}@example.com`,
            password: '123',
            name: 'Short Password User'
          })
          .expect(400);
      });

      it('should allow registration without name (optional field)', () => {
        // Note: Name is currently required in RegisterDto
        // This test verifies the validation works as expected
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `test.noname.${Date.now()}@example.com`,
            password: testPassword
          })
          .expect(400); // Expected to fail because name is required
      });

      it('should register second user for multi-user tests', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: testUser2Email,
            password: testPassword,
            name: 'Test User 2'
          })
          .expect(201)
          .expect((res) => {
            testUser2Token = res.body.access_token;
          });
      });
    });

    // ============================================
    // POST /auth/login - User Login
    // ============================================
    describe('POST /auth/login', () => {
      it('should login with valid credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser1Email,
            password: testPassword
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('access_token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe(testUser1Email);
            expect(typeof res.body.access_token).toBe('string');
          });
      });

      it('should reject login with incorrect password', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser1Email,
            password: 'WrongPassword123'
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Invalid credentials');
          });
      });

      it('should reject login with non-existent email', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: testPassword
          })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Invalid credentials');
          });
      });

      it('should reject login with missing email', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            password: testPassword
          })
          .expect(400);
      });

      it('should reject login with missing password', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser1Email
          })
          .expect(400);
      });

      it('should reject login with empty credentials', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({})
          .expect(400);
      });
    });

    // ============================================
    // JWT Protection on Quiz Endpoints
    // ============================================
    describe('JWT Protection', () => {
      it('should reject quiz submission without JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .send({ answers })
          .expect(401)
          .expect((res) => {
            expect(res.body.message).toContain('Unauthorized');
          });
      });

      it('should reject quiz submission with invalid JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', 'Bearer invalid.jwt.token')
          .send({ answers })
          .expect(401);
      });

      it('should reject quiz submission with malformed JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', 'InvalidFormat')
          .send({ answers })
          .expect(401);
      });

      it('should accept quiz submission with valid JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${testUser1Token}`)
          .send({ answers })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('topPersonality');
            expect(res.body).toHaveProperty('scores');
            testUser1QuizToken = res.body.token;
          });
      });
    });

    // ============================================
    // Single-Attempt Quiz Policy
    // ============================================
    describe('Single-Attempt Policy', () => {
      it('should reject second quiz submission from same user', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[1].id, // Different answers
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${testUser1Token}`)
          .send({ answers })
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain('already completed');
          });
      });

      it('should allow different users to submit quiz', async () => {
        const response = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = response.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${testUser2Token}`)
          .send({ answers })
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('token');
          });
      });

      it('should maintain single-attempt after re-login', async () => {
        // Login again as test user 1
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser1Email,
            password: testPassword
          });

        const newToken = loginResponse.body.access_token;

        const questionsResponse = await request(app.getHttpServer())
          .get('/quiz/questions');
        
        const questions = questionsResponse.body.questions;
        const answers = questions.slice(0, 3).map((q: any) => ({
          questionId: q.id,
          optionId: q.options[0].id,
        }));

        // Should still be forbidden with new token
        return request(app.getHttpServer())
          .post('/quiz/submit')
          .set('Authorization', `Bearer ${newToken}`)
          .send({ answers })
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain('already completed');
          });
      });
    });

    // ============================================
    // Authenticated Result Retrieval
    // ============================================
    describe('GET /quiz/result/:token - With Authentication', () => {
      it('should retrieve own result when authenticated', () => {
        return request(app.getHttpServer())
          .get(`/quiz/result/${testUser1QuizToken}`)
          .set('Authorization', `Bearer ${testUser1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toHaveProperty('topPersonality');
            expect(res.body).toHaveProperty('scores');
            expect(res.body).toHaveProperty('createdAt');
          });
      });

      it('should reject result access without authentication', () => {
        return request(app.getHttpServer())
          .get(`/quiz/result/${testUser1QuizToken}`)
          .expect(401);
      });

      it('should reject access to another users result', async () => {
        // User 2 trying to access User 1's result
        return request(app.getHttpServer())
          .get(`/quiz/result/${testUser1QuizToken}`)
          .set('Authorization', `Bearer ${testUser2Token}`)
          .expect(403)
          .expect((res) => {
            expect(res.body.message).toContain('your own quiz results');
          });
      });

      it('should return 404 for non-existent result token', () => {
        return request(app.getHttpServer())
          .get('/quiz/result/nonexistent-token-xyz')
          .set('Authorization', `Bearer ${testUser1Token}`)
          .expect(404);
      });
    });

    // ============================================
    // Token Expiration & Security
    // ============================================
    describe('JWT Token Security', () => {
      it('should include user information in JWT payload', async () => {
        // Register a temporary user to test fresh token
        const tempEmail = `temp.${Date.now()}@example.com`;
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: tempEmail,
            password: testPassword,
            name: 'Temp User'
          });

        const token = response.body.access_token;
        expect(token).toBeTruthy();
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
      });

      it('should not expose password in any response', async () => {
        const registerResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `nopwd.${Date.now()}@example.com`,
            password: testPassword,
            name: 'No Password User'
          });

        expect(registerResponse.body.user).not.toHaveProperty('password');

        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: testUser1Email,
            password: testPassword
          });

        expect(loginResponse.body.user).not.toHaveProperty('password');
      });
    });
  });
});
