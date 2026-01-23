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

const SearchForJobsInputSchema = z.object({
  cvContent: z.string().optional().describe("The user's CV content as plain text."),
  cvDataUri: z.string().optional().describe("A data URI of the user's CV file (PDF or text)."),
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

const SearchForJobsOutputSchema = z.object({
  results: z.array(JobSearchResultSchema).describe('A list of job search results.'),
});
export type SearchForJobsOutput = z.infer<typeof SearchForJobsOutputSchema>;

let searchForJobsFlow: any;

export async function searchForJobs(input: SearchForJobsInput): Promise<SearchForJobsOutput> {
  if (!searchForJobsFlow) {
    const prompt = ai.definePrompt({
      name: 'searchForJobsPrompt',
      input: {schema: SearchForJobsInputSchema},
      output: {schema: SearchForJobsOutputSchema},
      prompt: `You are an expert job search assistant. Your task is to find relevant and high-quality online job postings based on the user's CV and career goals.

User's CV:
\`\`\`
{{#if cvDataUri}}{{media url=cvDataUri}}{{else}}{{{cvContent}}}{{/if}}
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

    searchForJobsFlow = ai.defineFlow(
      {
        name: 'searchForJobsFlow',
        inputSchema: SearchForJobsInputSchema,
        outputSchema: SearchForJobsOutputSchema,
        retries: 3,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }
  return searchForJobsFlow(input);
}
