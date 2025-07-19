import { PermGuard, User } from '@app/backend-authorization';
import { Comment, Player } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CommentArgs } from '../args';

@Resolver(() => Comment)
export class CommentResolver {
  @Query(() => Comment)
  @UseGuards(PermGuard)
  async comment(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<Comment> {
    if (!(await user.hasAnyPermission(['edit:faq']))) {
      throw new ForbiddenException('Insufficient permissions to access comments');
    }
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
  @UseGuards(PermGuard)
  async comments(
    @User() user: Player,
    @Args('args', { type: () => CommentArgs, nullable: true })
    inputArgs?: InstanceType<typeof CommentArgs>,
  ): Promise<Comment[]> {
    if (!(await user.hasAnyPermission(['edit:faq']))) {
      throw new ForbiddenException('Insufficient permissions to access comments');
    }
    const args = CommentArgs.toFindManyOptions(inputArgs);
    return Comment.find(args);
  }
}
