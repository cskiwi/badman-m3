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

/**
 * Generate a standardized job identifier using tournament/competition type and specific identifiers
 */
export function generateJobId(type: 'tournament' | 'competition', component: string, ...identifiers: string[]): string {
  // Clean and format identifiers (remove special characters, limit length to 8)
  const cleanIdentifiers = identifiers
    .filter(id => id && id.trim())
    .map(id => id.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 8));
  
  // Create the standardized job ID: {type}-{component}-{identifiers}
  const parts = [type, component, ...cleanIdentifiers];
  return parts.join('-').toLowerCase();
}