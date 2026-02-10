import { z } from 'zod'

export const authSchema = z.object({
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .min(5, { message: 'Email must be at least 5 characters long.' })
    .max(255, { message: 'Email must be less than 255 characters.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .max(72, { message: 'Password must be less than 72 characters.' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' }),
})
