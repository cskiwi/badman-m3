import { PermGuard, User } from '@app/backend-authorization';
import { ImportFile, Player } from '@app/models';
import { ForbiddenException, NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ImportFileArgs } from '../args';

@Resolver(() => ImportFile)
export class ImportFileResolver {
  @Query(() => ImportFile)
  @UseGuards(PermGuard)
  async importFile(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ImportFile> {
    if (!(await user.hasAnyPermission(['import:competition']))) {
      throw new ForbiddenException('Insufficient permissions to access import files');
    }
    const importFile = await ImportFile.findOne({
      where: {
        id,
      },
    });

    if (importFile) {
      return importFile;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [ImportFile])
  @UseGuards(PermGuard)
  async importFiles(
    @User() user: Player,
    @Args('args', { type: () => ImportFileArgs, nullable: true })
    inputArgs?: InstanceType<typeof ImportFileArgs>,
  ): Promise<ImportFile[]> {
    if (!(await user.hasAnyPermission(['import:competition']))) {
      throw new ForbiddenException('Insufficient permissions to access import files');
    }
    const args = ImportFileArgs.toFindManyOptions(inputArgs);
    return ImportFile.find(args);
  }
}
