import { Injectable, HttpServer } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class InvalidateService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  invalidate(paths: string[]) {
    lastValueFrom(
      this.httpService.post(
        `${this.configService.get('BASE_URL')}/api/invalidate`,
        {
          token: this.configService.get('REVALIDATE_SECRET_TOKEN'),
          urlsToInvalidate: paths,
        },
      ),
    );
  }
}
