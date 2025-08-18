export enum AvaliableLanguages {
  'en' = 'en',
  'fr_BE' = 'fr_BE',
  'nl_BE' = 'nl_BE',
}

export const languages: Map<
  AvaliableLanguages,
  { translate: string; adapter: string; dayjs: string }
> = new Map([
  [AvaliableLanguages.en, { translate: 'en', adapter: 'en', dayjs: 'en' }],
  [AvaliableLanguages.fr_BE, { translate: 'fr_BE', adapter: 'fr', dayjs: 'fr' }],
  [AvaliableLanguages.nl_BE, { translate: 'nl_BE', adapter: 'nl-be', dayjs: 'nl' }],
]);
