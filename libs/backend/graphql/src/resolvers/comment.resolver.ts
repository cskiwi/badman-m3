import { Comment } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CommentArgs } from '../args';

@Resolver(() => Comment)
export class CommentResolver {
  @Query(() => Comment)
  async comment(@Args('id', { type: () => ID }) id: string): Promise<Comment> {
    const comment = await Comment.findOne({
      where: {
        id,
      },
    });

    if (comment) {
      return comment;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Comment])
  async comments(
    @Args('args', { type: () => CommentArgs, nullable: true })
    inputArgs?: InstanceType<typeof CommentArgs>,
  ): Promise<Comment[]> {
    const args = CommentArgs.toFindManyOptions(inputArgs);
    return Comment.find(args);
  }
}
