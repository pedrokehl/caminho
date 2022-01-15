export interface Job {
  job_id: string
}

export function getMockedJob(index: number): Job {
  return { job_id: `${index + 1}` }
}
