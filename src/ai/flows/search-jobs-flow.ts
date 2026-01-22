'use server';

/**
 * @fileOverview A flow to search the web for relevant job postings.
 *
 * - searchForJobs - A function that searches for jobs based on a CV and career goals.
 * - SearchForJobsInput - The input type for the searchForJobs function.
 * - SearchForJobsOutput - The return type for the searchForJobs function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SearchForJobsInputSchema = z.object({
  cv: z.string().describe("The user's CV content."),
  careerGoals: z.string().optional().describe("User's career goals."),
  location: z.string().optional().describe("Preferred job location (e.g., Accra, Ghana)."),
});
export type SearchForJobsInput = z.infer<typeof SearchForJobsInputSchema>;

const JobSearchResultSchema = z.object({
    title: z.string().describe('The title of the job posting.'),
    company: z.string().describe('The name of the company hiring.'),
    location: z.string().describe('The location of the job.'),
    url: z.string().url().describe('The URL to the job posting.'),
    snippet: z.string().describe('A brief snippet or description of the job.'),
});

export const SearchForJobsOutputSchema = z.object({
  results: z.array(JobSearchResultSchema).describe('A list of job search results.'),
});
export type SearchForJobsOutput = z.infer<typeof SearchForJobsOutputSchema>;

export async function searchForJobs(input: SearchForJobsInput): Promise<SearchForJobsOutput> {
  return searchForJobsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'searchForJobsPrompt',
  input: {schema: SearchForJobsInputSchema},
  output: {schema: SearchForJobsOutputSchema},
  prompt: `You are an expert job search assistant. Your task is to find relevant and high-quality online job postings based on the user's CV and career goals.

User's CV:
\`\`\`
{{{cv}}}
\`\`\`

{{#if careerGoals}}
Career Goals: {{{careerGoals}}}
{{/if}}

{{#if location}}
Preferred Location: {{{location}}}
{{/if}}

Please find 5-7 relevant job postings. For each job, provide a title, company, location, a valid URL, and a concise snippet.
Focus on jobs in Ghana if no location is specified. Ensure the URLs are real and lead to actual job application pages on well-known job boards (e.g., LinkedIn, Jobberman, etc.).
`,
});

const searchForJobsFlow = ai.defineFlow(
  {
    name: 'searchForJobsFlow',
    inputSchema: SearchForJobsInputSchema,
    outputSchema: SearchForJobsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
