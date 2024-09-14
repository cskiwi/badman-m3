import { Between, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from 'typeorm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queryFixer: (input: any) => unknown = (input: any) => {
  if (input === null || input === undefined) {
    return input;
  }

  if (Array.isArray(input)) {
    return (input as unknown[]).map(queryFixer);
  }

  for (const key in input) {
    if (input[key] === null || input[key] === undefined) {
      delete input[key];
      continue;
    } else if (typeof input[key] === 'object' && key !== '$between') {
      // Recursively apply queryFixer to nested objects
      input[key] = queryFixer(input[key]);
    }

    if (typeof input[key] === 'string' && input[key].startsWith('$')) {
      if (input[key] === '$null') {
        input[key] = IsNull();
      } else if (input[key] === '$nNull') {
        input[key] = Not(IsNull());
      }
    }

    if (!key.startsWith('$')) {
      continue;
    }

    const operatorMap = new Map<string, Record<string, unknown>>([
      ['$eq', input[key]],
      ['$ne', Not(input[key])],
      ['$lt', LessThan(input[key])],
      ['$lte', LessThanOrEqual(input[key])],
      ['$gt', MoreThan(input[key])],
      ['$gte', MoreThanOrEqual(input[key])],
      ['$in', In(input[key])],
      ['$nIn', Not(In(input[key]))],
      ['$like', Like(input[key])],
      ['$nLike', Not(Like(input[key]))],
      ['$iLike', ILike(input[key])],
      ['$nILike', Not(ILike(input[key]))],
      ['$between', Between(input[key][0], input[key][1])],
    ]);

    if (operatorMap.has(key)) {
      input = operatorMap.get(key);
    } else {
      console.warn(`Unknown key: ${key}, value: ${input[key]}`);
    }
  }

  return input as unknown;
};
