import { GraphQLScalarType, Kind } from 'graphql';
import { GraphQLJSONObject } from 'graphql-type-json';

/**
 * JSON object and an array of JSON objects
 * 
 * Developer note: this works in development but not when running the build
 */
export const JSONObjectOrArray = new GraphQLScalarType({
  name: 'JSONObjectOrArray',
  description: 'JSON object and an array of JSON objects',
  parseValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => GraphQLJSONObject.parseValue(item));
    }
    return GraphQLJSONObject.parseValue(value);
  },
  serialize(value) {
    if (Array.isArray(value)) {
      return value.map((item) => GraphQLJSONObject.serialize(item));
    }
    return GraphQLJSONObject.serialize(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.LIST) {
      return ast.values.map((item) => GraphQLJSONObject.parseLiteral(item));
    }
    return GraphQLJSONObject.parseLiteral(ast);
  },
});
