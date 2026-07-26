import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CharactersService } from '../characters.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdapterFactory } from '../../../common/adapters/adapter.factory';
import { StorageService } from '../../storage/storage.service';
import { CryptoService } from '../../common/crypto.service';
import { ConfigService } from '@nestjs/config';

describe('CharactersService', () => {
  let service: CharactersService;
  let prisma: any;

  const mockPrisma = {
    project: { findFirst: jest.fn() },
    character: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userApiKey: {
      findMany: jest.fn(),
    },
  };

  const mockAdapterFactory = { getImageAdapter: jest.fn() };
  const mockStorageService = {};
  const mockCryptoService = { decrypt: jest.fn() };
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CharactersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdapterFactory, useValue: mockAdapterFactory },
        { provide: StorageService, useValue: mockStorageService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CharactersService>(CharactersService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listByProject', () => {
    it('should return characters for valid project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1', userId: 'u1' });
      mockPrisma.character.findMany.mockResolvedValue([
        { id: 'c1', name: '小明' },
      ]);

      const result = await service.listByProject('u1', 'p1');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('小明');
    });

    it('should throw for invalid project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);
      await expect(service.listByProject('u1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create character with default lockLevel', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.create.mockResolvedValue({
        id: 'c1', name: '小明', lockLevel: 'medium',
      });

      const result = await service.create('u1', 'p1', { name: '小明' });
      expect(result.data.name).toBe('小明');
      expect(result.data.lockLevel).toBe('medium');
    });

    it('should create character with custom lockLevel', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.create.mockResolvedValue({
        id: 'c1', name: '小红', lockLevel: 'strict',
      });

      const result = await service.create('u1', 'p1', { name: '小红', lockLevel: 'strict' });
      expect(result.data.lockLevel).toBe('strict');
    });
  });

  describe('update', () => {
    it('should update character fields', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1' });
      mockPrisma.character.update.mockResolvedValue({
        id: 'c1', name: '新名字', lockLevel: 'strict',
      });

      const result = await service.update('u1', 'p1', 'c1', {
        name: '新名字',
        lockLevel: 'strict',
      });
      expect(result.data.name).toBe('新名字');
    });

    it('should throw for non-existent character', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.findFirst.mockResolvedValue(null);

      await expect(
        service.update('u1', 'p1', 'invalid', { name: 'test' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete existing character', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1' });
      mockPrisma.character.delete.mockResolvedValue({});

      const result = await service.delete('u1', 'p1', 'c1');
      expect(result.success).toBe(true);
    });
  });

  describe('getVariantTypes', () => {
    it('should return variant types grouped by category', () => {
      const result = service.getVariantTypes();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('value');
      expect(result.data[0]).toHaveProperty('label');
      expect(result.data[0]).toHaveProperty('category');
    });
  });

  describe('clearViewImages', () => {
    it('should clear view images', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.character.findFirst.mockResolvedValue({ id: 'c1', projectId: 'p1' });
      mockPrisma.character.update.mockResolvedValue({});

      const result = await service.clearViewImages('u1', 'p1', 'c1');
      expect(result.data.cleared).toBe(true);
    });
  });
});
