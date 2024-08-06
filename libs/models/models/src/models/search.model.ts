import { ObjectType } from '@nestjs/graphql';

@ObjectType('Search')
export class Search {
  declare id: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare sub: string;
  declare firstName: string;
  declare lastName: string;
  declare slug: string;
  declare memberId: string;
  declare email: string;
}