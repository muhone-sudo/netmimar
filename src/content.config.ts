import { defineCollection, z } from 'astro:content';

/**
 * Astro Content Collections yapılandırması.
 * Keystatic tarafından yönetilen içeriklerin Astro tarafından tanınmasını sağlar.
 */

const services = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        icon: z.string().optional(),
        shortDescription: z.string(),
        featuredImage: z.string().optional(),
    }),
});

const projects = defineCollection({
    type: 'content',
    schema: z.object({
        projectName: z.string(),
        client: z.string().optional(),
        date: z.string().optional(),
        category: z.string().optional(),
        coverImage: z.string().optional(),
        gallery: z.array(z.string()).optional(),
    }),
});

const blog = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        author: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        coverImage: z.string().optional(),
    }),
});

const team = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
        role: z.string(),
        photo: z.string().optional(),
        order: z.number().optional().default(0),
        socialLinkedin: z.string().optional(),
        socialTwitter: z.string().optional(),
        socialInstagram: z.string().optional(),
        socialEmail: z.string().optional(),
    }),
});

export const collections = {
    services,
    projects,
    blog,
    team,
};
