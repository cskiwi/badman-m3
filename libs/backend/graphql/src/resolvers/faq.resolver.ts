import { AllowAnonymous } from '@app/backend-authorization';
import { Faq } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { FaqArgs } from '../args';

@Resolver(() => Faq)
export class FaqResolver {
  @Query(() => Faq)
  @AllowAnonymous()
  async faq(@Args('id', { type: () => ID }) id: string): Promise<Faq> {
    const faq = await Faq.findOne({
      where: {
        id,
      },
    });

    if (faq) {
      return faq;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Faq])
  @AllowAnonymous()
  async faqs(
    @Args('args', { type: () => FaqArgs, nullable: true })
    inputArgs?: InstanceType<typeof FaqArgs>,
  ): Promise<Faq[]> {
    const args = FaqArgs.toFindManyOptions(inputArgs);
    return Faq.find(args);
  }
}
