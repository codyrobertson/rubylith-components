import { z } from 'zod';
import { ComponentType, ComponentLifecycle } from '../../types/component';

// Validation schema for component creation
const createComponentSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.nativeEnum(ComponentType),
  lifecycle: z.nativeEnum(ComponentLifecycle),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  keywords: z.array(z.string()),
  contractId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export { createComponentSchema };

// Mock component service for testing
export class ComponentService {
  static async create(data: z.infer<typeof createComponentSchema>) {
    // Validate the data
    const validatedData = createComponentSchema.parse(data);
    
    // Mock component creation
    const component = {
      id: Math.random().toString(36).substring(7),
      ...validatedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return component;
  }
}

// Mock API route handler
export async function createComponent(requestData: any) {
  try {
    const component = await ComponentService.create(requestData);
    return { status: 201, data: component };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        status: 400, 
        error: 'Validation failed', 
        details: error.issues 
      };
    }
    return { 
      status: 500, 
      error: 'Internal server error' 
    };
  }
}