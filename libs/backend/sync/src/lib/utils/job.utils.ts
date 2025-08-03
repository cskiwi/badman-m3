import { Job } from 'bullmq';

/**
 * Extract parentId from job data
 * 
 * This utility function checks various places where parent information
 * might be stored in BullMQ jobs and extracts the parent ID if found.
 */
export function extractParentId(job: Job | any): string | undefined {
  // First check if the job has a parent property directly
  if (job.parent?.id) {
    return job.parent.id;
  }

  // Check if the opts contains parent information
  if (job.opts?.parent?.id) {
    return job.opts.parent.id;
  }

  // For child jobs, opts might be a string that needs parsing
  if (typeof job.opts === 'string') {
    try {
      const parsedOpts = JSON.parse(job.opts);
      if (parsedOpts.parent?.id) {
        return parsedOpts.parent.id;
      }
    } catch {
      // Failed to parse opts, continue with other methods
    }
  }

  return undefined;
}