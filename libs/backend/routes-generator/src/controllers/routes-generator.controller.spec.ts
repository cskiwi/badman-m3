import { Test } from '@nestjs/testing';
import { RoutesGeneratorController } from './routes-generator.controller';
import { RoutesGeneratorService } from '../services/routes-generator.service';

describe('RoutesGeneratorController', () => {
  let controller: RoutesGeneratorController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RoutesGeneratorService],
      controllers: [RoutesGeneratorController],
    }).compile();

    controller = module.get(RoutesGeneratorController);
  });

  it('should be defined', () => {
    expect(controller).toBeTruthy();
  });
});
