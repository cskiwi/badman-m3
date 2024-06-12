import { FindOptionsWhere } from 'typeorm';

export const addId = <T>(
  a: Partial<{
    id: string;
  }>,
  where: FindOptionsWhere<T>[],
  key: keyof T,
) => {
  where = where.filter((arg) => Object.keys(arg)[0] !== key);

  if (where.length === 0) {
    where.push({ [key]: a.id } as FindOptionsWhere<T>);
  } else {
    where = where?.map((arg) => {
      return { ...arg, [key]: a.id };
    });
  }

  return where;
};
