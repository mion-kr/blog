import { TestBed, Mocked } from '@suites/unit';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: Mocked<AppService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(AppController).compile();
    appController = unit;
    appService = unitRef.get(AppService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      appService.getHello.mockReturnValue('Hello World!');

      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
