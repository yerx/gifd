import { z } from "zod";

export const gifdBuilderConfigSchema = z.object({
  groundworkRoot: z.string().optional(),
  draftsRoot: z.string().optional(),
  models: z
    .object({
      codegen: z.string().default("claude-opus-4-7"),
      clarify: z.string().default("claude-haiku-4-5"),
    })
    .default({}),
  tokenBudget: z
    .object({
      perSessionUsd: z.number().min(0).max(100).default(5),
    })
    .default({}),
});

export type GifdBuilderConfig = z.infer<typeof gifdBuilderConfigSchema>;
