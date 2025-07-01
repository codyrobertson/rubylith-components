import { createComponent, ComponentService } from '../../src/api/routes/components';
import { 
  createComponentFixture, 
  createMinimalComponentFixture,
  createInvalidComponentFixture 
} from '../fixtures/components';
import { ComponentType, ComponentLifecycle } from '../../src/types/component';

describe('Component Creation Integration Tests', () => {
  describe('Component API Route', () => {
    it('should create a new component with valid data', async () => {
      const validData = createComponentFixture();
      const result = await createComponent(validData);
      
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBeDefined();
      expect(result.data.name).toBe(validData.name);
      expect(result.data.version).toBe(validData.version);
      expect(result.data.type).toBe(validData.type);
      expect(result.data.lifecycle).toBe(validData.lifecycle);
      expect(result.data.description).toBe(validData.description);
      expect(result.data.author).toBe(validData.author);
      expect(result.data.license).toBe(validData.license);
      expect(result.data.homepage).toBe(validData.homepage);
      expect(result.data.repository).toBe(validData.repository);
      expect(result.data.keywords).toEqual(validData.keywords);
      expect(result.data.contractId).toBe(validData.contractId);
      expect(result.data.metadata).toEqual(validData.metadata);
      expect(result.data.createdAt).toBeDefined();
      expect(result.data.updatedAt).toBeDefined();
    });

    it('should create a component with minimal required data', async () => {
      const minimalData = createMinimalComponentFixture();
      const result = await createComponent(minimalData);
      
      expect(result.status).toBe(201);
      expect(result.data).toBeDefined();
      expect(result.data.name).toBe(minimalData.name);
      expect(result.data.homepage).toBeUndefined();
      expect(result.data.repository).toBeUndefined();
      expect(result.data.contractId).toBeUndefined();
      expect(result.data.metadata).toBeUndefined();
    });

    it('should fail validation with invalid data', async () => {
      const invalidData = createInvalidComponentFixture();
      const result = await createComponent(invalidData);
      
      expect(result.status).toBe(400);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
      expect(result.details.length).toBeGreaterThan(0);
    });

    it('should validate version format correctly', async () => {
      const invalidVersionData = createComponentFixture({ version: 'not-semver' });
      const result = await createComponent(invalidVersionData);
      
      expect(result.status).toBe(400);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toBeDefined();
      
      const versionError = result.details.find((detail: any) => 
        detail.path.includes('version')
      );
      expect(versionError).toBeDefined();
    });

    it('should validate URL format for homepage and repository', async () => {
      const invalidUrlData = createComponentFixture({ 
        homepage: 'not-a-url',
        repository: 'also-not-a-url'
      });
      const result = await createComponent(invalidUrlData);
      
      expect(result.status).toBe(400);
      expect(result.details).toBeDefined();
      
      const urlErrors = result.details.filter((detail: any) => 
        detail.path.includes('homepage') || detail.path.includes('repository')
      );
      expect(urlErrors.length).toBeGreaterThan(0);
    });

    it('should validate enum values for type and lifecycle', async () => {
      const invalidEnumData = createComponentFixture({ 
        type: 'invalid-type' as any,
        lifecycle: 'invalid-lifecycle' as any
      });
      const result = await createComponent(invalidEnumData);
      
      expect(result.status).toBe(400);
      expect(result.details).toBeDefined();
      
      const enumErrors = result.details.filter((detail: any) => 
        detail.path.includes('type') || detail.path.includes('lifecycle')
      );
      expect(enumErrors.length).toBe(2);
    });

    it('should validate keywords as array', async () => {
      const invalidKeywordsData = createComponentFixture({ 
        keywords: 'not-an-array' as any 
      });
      const result = await createComponent(invalidKeywordsData);
      
      expect(result.status).toBe(400);
      expect(result.details).toBeDefined();
      
      const keywordsError = result.details.find((detail: any) => 
        detail.path.includes('keywords')
      );
      expect(keywordsError).toBeDefined();
    });
  });

  describe('ComponentService', () => {
    it('should create component through service directly', async () => {
      const validData = createComponentFixture();
      const component = await ComponentService.create(validData);
      
      expect(component).toBeDefined();
      expect(component.id).toBeDefined();
      expect(component.name).toBe(validData.name);
      expect(component.version).toBe(validData.version);
      expect(component.createdAt).toBeDefined();
      expect(component.updatedAt).toBeDefined();
    });

    it('should throw validation error for invalid data', async () => {
      const invalidData = createInvalidComponentFixture();
      
      await expect(ComponentService.create(invalidData)).rejects.toThrow();
    });
  });

  describe('Component Type and Lifecycle Validation', () => {
    const testCases = [
      { type: ComponentType.BUTTON, lifecycle: ComponentLifecycle.STABLE },
      { type: ComponentType.INPUT, lifecycle: ComponentLifecycle.BETA },
      { type: ComponentType.CARD, lifecycle: ComponentLifecycle.ALPHA },
      { type: ComponentType.MODAL, lifecycle: ComponentLifecycle.DEPRECATED },
    ];

    testCases.forEach(({ type, lifecycle }) => {
      it(`should accept valid ${type} component with ${lifecycle} lifecycle`, async () => {
        const data = createComponentFixture({ type, lifecycle });
        const result = await createComponent(data);
        
        expect(result.status).toBe(201);
        expect(result.data.type).toBe(type);
        expect(result.data.lifecycle).toBe(lifecycle);
      });
    });
  });
});