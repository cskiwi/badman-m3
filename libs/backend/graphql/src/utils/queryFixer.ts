import { Between, FindOptionsWhere, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not, Raw } from 'typeorm';

export interface GraphQLWhereInput<T> {
  $or?: GraphQLWhereInput<T>[];
  $and?: GraphQLWhereInput<T>[];
  [field: string]: any;
}

export class GraphQLWhereConverter {
  static convert<T>(where: GraphQLWhereInput<T> | GraphQLWhereInput<T>[]): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (!where) {
      return {} as FindOptionsWhere<T>;
    }

    // Handle array input - convert each item and flatten
    if (Array.isArray(where)) {
      const results = where.map(item => this.convert<T>(item));
      // If any result is an array, we need to flatten appropriately
      const flattened = results.flatMap(result => Array.isArray(result) ? result : [result]);
      return flattened.length === 1 ? flattened[0] : flattened;
    }

    // Handle $or - returns array of conditions
    if (where.$or && Array.isArray(where.$or)) {
      const result = where.$or.map((condition) => {
        const converted = this.convert<T>(condition);
        return Array.isArray(converted) ? converted[0] : converted;
      }) as FindOptionsWhere<T>[];
      return result;
    }

    // Handle $and - merge all conditions into single object
    if (where.$and && Array.isArray(where.$and)) {
      const merged: Record<string, any> = {};
      where.$and.forEach((condition) => {
        const result = this.convert<T>(condition);
        const resultObj = Array.isArray(result) ? result[0] : result;
        Object.assign(merged, resultObj);
      });
      return merged as FindOptionsWhere<T>;
    }

    // Handle regular field conditions
    const result: Record<string, any> = {};

    Object.entries(where).forEach(([field, value]) => {
      // Skip logical operators
      if (field === '$or' || field === '$and') {
        return;
      }

      result[field] = this.convertValue(value);
    });

    return result as FindOptionsWhere<T>;
  }

  private static convertValue(value: any): any {
    // Simple value (string, number, boolean, null)
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return value;
    }

    // Check if it's an operator object
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0].startsWith('$')) {
      return this.convertOperator(keys[0], value[keys[0]]);
    }

    // Multiple operators on same field - shouldn't happen in normal cases
    if (keys.every((key) => key.startsWith('$'))) {
      // For now, just take the first operator
      const firstKey = keys[0];
      return this.convertOperator(firstKey, value[firstKey]);
    }

    // Not an operator object, return as-is
    return value;
  }

  private static convertOperator(operator: string, operatorValue: any): any {
    switch (operator) {
      case '$eq':
        return operatorValue;

      case '$ne':
        return Not(operatorValue);

      case '$in':
        return In(operatorValue);

      case '$nin':
        return Not(In(operatorValue));

      case '$gt':
        return MoreThan(operatorValue);

      case '$gte':
        return MoreThanOrEqual(operatorValue);

      case '$lt':
        return LessThan(operatorValue);

      case '$lte':
        return LessThanOrEqual(operatorValue);

      case '$like':
        return Like(operatorValue);

      case '$ilike':
        return ILike(operatorValue);

      case '$between':
        return Between(operatorValue[0], operatorValue[1]);

      case '$null':
        return operatorValue ? IsNull() : Not(IsNull());

      case '$raw':
        return Raw(operatorValue);

      default:
        // Unknown operator, return the value as-is
        return operatorValue;
    }
  }
}

