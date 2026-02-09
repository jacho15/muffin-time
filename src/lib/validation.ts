import { z } from 'zod';

// --- Auth Schemas ---

export const emailSchema = z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .min(5, { message: 'Email must be at least 5 characters long.' })
    .max(255, { message: 'Email must be less than 255 characters.' });

export const passwordSchema = z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .max(72, { message: 'Password must be less than 72 characters.' }) // bcrypt limit
    .regex(/[0-9]/, { message: 'Password must contain at least one number.' })
    .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter.' });

export const authSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});

// --- Application Data Schemas ---

export const todoSchema = z.object({
    title: z.string().min(1, 'Title is required').max(280, 'Title is too long'),
    description: z.string().max(1000, 'Description is too long').optional(),
    due_date: z.string().datetime({ offset: true }).optional().nullable(),
    course: z.string().max(100, 'Course name is too long').optional().nullable(),
});

export const eventSchema = z.object({
    title: z.string().min(1, 'Title is required').max(280, 'Title is too long'),
    description: z.string().max(1000, 'Description is too long').optional(),
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }),
    calendar_id: z.string().uuid('Invalid calendar ID'),
}).refine((data) => {
    const start = new Date(data.start_time);
    const end = new Date(data.end_time);
    return end >= start;
}, {
    message: "End time must be after start time",
    path: ["end_time"],
});

export const subjectSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
});
