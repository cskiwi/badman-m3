import { Module } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { I18nModule, QueryResolver } from 'nestjs-i18n';
import { join } from 'path';
import { TranslateController } from './controllers';

@Module({
  controllers: [TranslateController],
  imports: [
    I18nModule.forRootAsync({
      resolvers: [{ use: QueryResolver, options: ['lang'] }],

      useFactory: () => {
        const apiDistFolderPath = join(process.cwd(), 'dist/apps/api');
        const dir = join(
          apiDistFolderPath,
          '../../../libs/utils/src/translation/',
        );
        const file = join(dir, 'i18n.generated.ts');

        if (!existsSync(file)) {
          mkdirSync(dir, {
            recursive: true,
          });
          writeFileSync(
            file,
            `import { Path } from "nestjs-i18n";
            export type I18nTranslations = {};
            export type I18nPath = Path<I18nTranslations>;`,
            { encoding: 'utf8' },
          );
        }

        return {
          fallbackLanguage: 'nl_BE',
          loaderOptions: {
            path: join(apiDistFolderPath, `./assets/i18n/`),
            // watch: true,
          },
          typesOutputPath: file,
        };
      },
    }),
  ],
  exports: [],
})
export class TranslateModule {}
