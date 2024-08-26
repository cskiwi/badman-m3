import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Type } from '@nestjs/common';
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortDirection, {
  name: 'SortDirection',
});

// A utility function to generate a SortOrderType for any entity type
export function SortOrderType<T>(classRef: Type<T>): Type<any> {
  @InputType({ isAbstract: true })
  class SortOrderTypeClass {
    constructor() {
      const instance = new classRef();
      const keys = Object.keys(instance as object);

      keys.forEach((key) => {
        // Dynamically define a field for each key in the input type
        Field(() => SortDirection, { nullable: true })(this, key);
      });
    }
  }

  return SortOrderTypeClass;
}
