import { z } from 'zod';

export const DivisionSchema = z.object({
  name: z.string()
    .min(1, { message: 'Division name is required.' })
    .max(100, { message: 'Division name must be 100 characters or fewer.' }),
});
