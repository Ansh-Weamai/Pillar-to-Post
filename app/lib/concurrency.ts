// Simple worker-pool queue: runs `worker` over every item, at most `limit` in
// flight at once, preserving input order in the returned array. Used to keep
// batch vision calls from bursting past free-tier rate limits.
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function runWorker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runWorker);
  await Promise.all(workers);

  return results;
}
