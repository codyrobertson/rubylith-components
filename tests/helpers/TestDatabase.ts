import { Express } from 'express';

export interface UserData {
  id?: string;
  email: string;
  password: string;
  name?: string;
  role?: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  createdAt: Date;
}

export class TestDatabase {
  private static instance: TestDatabase;
  private users: Map<string, CreatedUser> = new Map();
  private userIdCounter = 1;

  private constructor() {}

  public static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  public async createUser(userData: UserData): Promise<CreatedUser> {
    // Generate a unique ID if not provided
    const id = userData.id || `test-user-${this.userIdCounter++}`;
    
    // Check if user already exists
    if (this.users.has(userData.email)) {
      throw new Error(`User with email ${userData.email} already exists`);
    }

    const createdUser: CreatedUser = {
      id,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: new Date()
    };

    this.users.set(userData.email, createdUser);
    this.users.set(id, createdUser); // Also store by ID for lookups
    
    return createdUser;
  }

  public async getUserByEmail(email: string): Promise<CreatedUser | null> {
    return this.users.get(email) || null;
  }

  public async getUserById(id: string): Promise<CreatedUser | null> {
    return this.users.get(id) || null;
  }

  public async deleteUser(emailOrId: string): Promise<boolean> {
    const user = this.users.get(emailOrId);
    if (!user) {
      return false;
    }

    // Remove by both email and ID
    this.users.delete(user.email);
    this.users.delete(user.id);
    return true;
  }

  public async clearAllUsers(): Promise<void> {
    this.users.clear();
    this.userIdCounter = 1;
  }

  public async getAllUsers(): Promise<CreatedUser[]> {
    // Return only unique users (since we store by both email and ID)
    const uniqueUsers = new Map<string, CreatedUser>();
    for (const user of this.users.values()) {
      uniqueUsers.set(user.id, user);
    }
    return Array.from(uniqueUsers.values());
  }

  public async updateUser(emailOrId: string, updates: Partial<UserData>): Promise<CreatedUser | null> {
    const user = this.users.get(emailOrId);
    if (!user) {
      return null;
    }

    const updatedUser: CreatedUser = {
      ...user,
      ...updates,
      id: user.id, // Preserve the original ID
      createdAt: user.createdAt // Preserve creation date
    };

    // Update in both maps
    this.users.set(user.email, updatedUser);
    this.users.set(user.id, updatedUser);

    return updatedUser;
  }
}