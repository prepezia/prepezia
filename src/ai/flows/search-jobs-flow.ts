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
  cvContentType: z.string().optional().describe("The MIME type of the CV file."),
  careerGoals: z.string().optional().describe("User's career goals."),
  role: z.string().optional().describe("The desired role or job title (e.g., Software Engineer, Marketing Manager)."),
  jobType: z.string().optional().describe("The desired job type (e.g., Full-time, Part-time, Internship)."),
  industry: z.string().optional().describe("The desired industry (e.g., Technology, Finance)."),
  experienceLevel: z.string().optional().describe("The desired experience level (e.g., Entry-level, Mid-level, Senior)."),
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
      model: 'googleai/gemini-2.5-flash',
      input: {schema: SearchForJobsInputSchema},
      output: {schema: SearchForJobsOutputSchema},
      prompt: `You are an expert job search assistant. Your task is to find relevant and high-quality online job postings based on the user's CV and search criteria.

User's CV:
\`\`\`
{{#if cvDataUri}}{{media url=cvDataUri contentType=cvContentType}}{{else}}{{{cvContent}}}{{/if}}
\`\`\`

Search Criteria:
{{#if careerGoals}}- General Career Goals: {{{careerGoals}}}{{/if}}
{{#if role}}- Role/Title: {{{role}}}{{/if}}
{{#if jobType}}- Job Type: {{{jobType}}}{{/if}}
{{#if industry}}- Industry: {{{industry}}}{{/if}}
{{#if experienceLevel}}- Experience Level: {{{experienceLevel}}}{{/if}}
{{#if location}}- Location: {{{location}}}{{/if}}

Please find 5-7 relevant job postings based on the provided criteria.
Focus on jobs in Ghana if no location is specified. Ensure the URLs are real and lead to actual job application pages on well-known job boards (e.g., LinkedIn, Jobberman, etc.).
`,
    });

    searchForJobsFlow = ai.defineFlow(
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
  }
  return searchForJobsFlow(input);
}
