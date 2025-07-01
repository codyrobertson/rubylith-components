import { Express, Request, Response } from 'express';
import { TestDatabase, UserData, CreatedUser } from './TestDatabase';
import * as jwt from 'jsonwebtoken';

export interface AuthResult {
  user: CreatedUser;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class ApiTestHelper {
  private testDb: TestDatabase;
  private jwtSecret: string = 'test-jwt-secret';

  constructor(private app: Express, testDb?: TestDatabase) {
    this.testDb = testDb || TestDatabase.getInstance();
  }

  public async createUser(userData: UserData): Promise<CreatedUser> {
    return await this.testDb.createUser(userData);
  }

  public async authenticateUser(userData: UserData): Promise<AuthResult> {
    // Create the user first
    const user = await this.createUser(userData);
    
    // Generate a token for the user
    const token = await this.loginUser(user.email, userData.password);
    
    return { user, token };
  }

  public async loginUser(email: string, password: string): Promise<string> {
    // In a real scenario, this would verify the password
    // For testing purposes, we'll just check if the user exists
    const user = await this.testDb.getUserByEmail(email);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      this.jwtSecret,
      { 
        expiresIn: '1h',
        issuer: 'rubylith-test'
      }
    );

    return token;
  }

  public async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  public async makeAuthenticatedRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    token: string,
    data?: any
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const request = this.app[method.toLowerCase() as keyof Express](path) as any;
      
      request
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .end((err: any, res: Response) => {
          if (err) {
            reject(err);
          } else {
            resolve(res);
          }
        });
    });
  }

  public async setupTestUser(userData: Partial<UserData> = {}): Promise<AuthResult> {
    const defaultUserData: UserData = {
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
      name: 'Test User',
      role: 'user',
      ...userData
    };

    return await this.authenticateUser(defaultUserData);
  }

  public async setupAdminUser(userData: Partial<UserData> = {}): Promise<AuthResult> {
    const adminUserData: UserData = {
      email: `admin-${Date.now()}@example.com`,
      password: 'admin-password-123',
      name: 'Admin User',
      role: 'admin',
      ...userData
    };

    return await this.authenticateUser(adminUserData);
  }

  public async cleanupTestData(): Promise<void> {
    await this.testDb.clearAllUsers();
  }

  public async getUserByEmail(email: string): Promise<CreatedUser | null> {
    return await this.testDb.getUserByEmail(email);
  }

  public async getUserById(id: string): Promise<CreatedUser | null> {
    return await this.testDb.getUserById(id);
  }

  public async deleteUser(emailOrId: string): Promise<boolean> {
    return await this.testDb.deleteUser(emailOrId);
  }

  public getTestDatabase(): TestDatabase {
    return this.testDb;
  }
}