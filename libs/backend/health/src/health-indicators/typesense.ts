// import { Inject, Injectable } from '@nestjs/common';
// import {
//   HealthIndicator,
//   HealthIndicatorResult,
//   HealthCheckError,
// } from '@nestjs/terminus';
// import { Client } from 'typesense';
// import { IndexingClient } from '@app/backend-serach';

// @Injectable()
// export class TypeSenseIndicator extends HealthIndicator {
//   constructor(
//     @Inject(IndexingClient.TYPESENSE_CLIENT)
//     private readonly typeSenseClient: Client,
//   ) {
//     super();
//   }

//   async isHealthy(key: string): Promise<HealthIndicatorResult> {
//     const isHealthy = await this.typeSenseClient.health.retrieve();
//     const result = this.getStatus(key, isHealthy.ok);

//     if (isHealthy) {
//       return result;
//     }
//     throw new HealthCheckError('TypesenseChecek failed', result);
//   }
// }
