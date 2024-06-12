import { Test } from '@nestjs/testing';
import { RoutesGeneratorService } from './routes-generator.service';

describe('RoutesGeneratorService', () => {
  let service: RoutesGeneratorService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RoutesGeneratorService],
    }).compile();

    service = module.get(RoutesGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeTruthy();
  });
});
