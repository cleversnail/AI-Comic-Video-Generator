import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StoryboardService } from '../storyboard.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ModelsService } from '../../models/models.service';
import { AdapterFactory } from '../../../common/adapters/adapter.factory';

describe('StoryboardService', () => {
  let service: StoryboardService;
  let prisma: any;
  let modelsService: any;
  let adapterFactory: any;

  const mockPrisma = {
    project: { findFirst: jest.fn() },
    shot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    storyboard: { findFirst: jest.fn(), create: jest.fn() },
    character: { findMany: jest.fn() },
  };

  const mockModelsService = {
    resolveApiKey: jest.fn(),
  };

  const mockAdapterFactory = {
    getLLMAdapter: jest.fn(),
    getImageAdapter: jest.fn(),
    getTTSAdapter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoryboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ModelsService, useValue: mockModelsService },
        { provide: AdapterFactory, useValue: mockAdapterFactory },
      ],
    }).compile();

    service = module.get<StoryboardService>(StoryboardService);
    prisma = module.get(PrismaService);
    modelsService = module.get(ModelsService);
    adapterFactory = module.get(AdapterFactory);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listShots', () => {
    it('should return shots for valid project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1', userId: 'u1' });
      mockPrisma.shot.findMany.mockResolvedValue([
        { id: 's1', sequence: 1, prompt: 'test' },
      ]);

      const result = await service.listShots('u1', 'p1');
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.shot.findMany).toHaveBeenCalledWith({
        where: { projectId: 'p1' },
        orderBy: { sequence: 'asc' },
      });
    });

    it('should throw NotFoundException for invalid project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);
      await expect(service.listShots('u1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteShot', () => {
    it('should delete existing shot', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.shot.findFirst.mockResolvedValue({ id: 's1', projectId: 'p1' });
      mockPrisma.shot.delete.mockResolvedValue({});

      const result = await service.deleteShot('u1', 'p1', 's1');
      expect(result.success).toBe(true);
      expect(mockPrisma.shot.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('should throw NotFoundException for non-existent shot', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.shot.findFirst.mockResolvedValue(null);

      await expect(service.deleteShot('u1', 'p1', 'invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateShot', () => {
    it('should update shot params', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.shot.findFirst.mockResolvedValue({
        id: 's1',
        projectId: 'p1',
        params: { title: 'old' },
      });
      mockPrisma.shot.update.mockResolvedValue({ id: 's1' });

      await service.updateShot('u1', 'p1', 's1', { title: 'new' });
      expect(mockPrisma.shot.update).toHaveBeenCalled();
    });

    it('should sync character names when characterIds provided', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1' });
      mockPrisma.shot.findFirst.mockResolvedValue({
        id: 's1',
        projectId: 'p1',
        params: {},
      });
      mockPrisma.character.findMany.mockResolvedValue([
        { id: 'c1', name: '小明' },
        { id: 'c2', name: '小红' },
      ]);
      mockPrisma.shot.update.mockResolvedValue({ id: 's1' });

      await service.updateShot('u1', 'p1', 's1', { characterIds: ['c1', 'c2'] });
      const updateCall = mockPrisma.shot.update.mock.calls[0][0];
      expect(updateCall.data.params.characterIds).toEqual(['c1', 'c2']);
      expect(updateCall.data.params.characters).toEqual(['小明', '小红']);
    });
  });

  describe('generateShots', () => {
    it('should generate shots from story', async () => {
      mockPrisma.project.findFirst.mockResolvedValue({ id: 'p1', userId: 'u1' });
      mockModelsService.resolveApiKey.mockResolvedValue({
        apiKey: 'key', modelId: 'deepseek-v3', baseUrl: undefined,
      });
      mockPrisma.character.findMany.mockResolvedValue([]);
      mockPrisma.storyboard.findFirst.mockResolvedValue({ id: 'sb1' });
      mockPrisma.shot.deleteMany.mockResolvedValue({});

      const mockLLM = {
        generateText: jest.fn().mockResolvedValue({
          content: JSON.stringify([
            { title: '分镜1', prompt: 'test prompt', characters: [] },
          ]),
        }),
      };
      adapterFactory.getLLMAdapter.mockReturnValue(mockLLM);
      mockPrisma.shot.create.mockResolvedValue({ id: 's1' });

      const result = await service.generateShots('u1', 'p1', { story: '一个故事' });
      expect(result.data).toBeDefined();
      expect(mockPrisma.shot.deleteMany).toHaveBeenCalled();
    });

    it('should throw for invalid project', async () => {
      mockPrisma.project.findFirst.mockResolvedValue(null);
      await expect(
        service.generateShots('u1', 'invalid', { story: 'test' })
      ).rejects.toThrow(NotFoundException);
    });
  });
});
