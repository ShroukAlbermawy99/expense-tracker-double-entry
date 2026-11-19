import { TestBed } from '@angular/core/testing';
import { TransactionDataService } from './transaction-data.service';

describe('TransactionDataService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TransactionDataService],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(TransactionDataService);
    expect(service).toBeTruthy();
  });
});
