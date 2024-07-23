import { AllowAnonymous } from '@app/backend-authorization';
import { I18nTranslations } from '@app/utils';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Response } from 'express';

type languages = 'en' | 'fr_BE' | 'nl_BE';

@Controller('translate')
export class TranslateController {
  constructor(private readonly i18nService: I18nService<I18nTranslations>) {}

  @AllowAnonymous()
  @Get('i18n/:lang')
  async translations(
    @Param() param: { lang: languages },
    @Res() res: Response,
  ) {
    const translated = this.i18nService.getTranslations();

    res.send(translated[param.lang]);
  }
}
