export interface Note {
  id: number;
  text: string;
  tags: string[];
  createdAt: string;
}

export const EXIT_CODE = {
  SUCCESS: 0,
  INTERNAL_ERROR: 1,
  INVALID_INPUT: 2,
  NOT_FOUND: 3,
  STORAGE_ERROR: 4,
} as const;

export type ExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];
