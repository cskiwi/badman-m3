import { ImportFile } from '@app/models';
import { NotFoundException } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { ImportFileArgs } from '../args';

@Resolver(() => ImportFile)
export class ImportFileResolver {
  @Query(() => ImportFile)
  async importFile(@Args('id', { type: () => ID }) id: string): Promise<ImportFile> {
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
  async importFiles(
    @Args('args', { type: () => ImportFileArgs, nullable: true })
    inputArgs?: InstanceType<typeof ImportFileArgs>,
  ): Promise<ImportFile[]> {
    const args = ImportFileArgs.toFindManyOptions(inputArgs);
    return ImportFile.find(args);
  }
}
