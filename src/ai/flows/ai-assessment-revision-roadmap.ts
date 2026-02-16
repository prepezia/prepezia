'use server';

/**
 * @fileOverview Generates a personalized revision roadmap based on student's exam performance.
 *
 * - aiAssessmentRevisionRoadmap - A function that handles the generation of revision roadmap.
 * - AiAssessmentRevisionRoadmapInput - The input type for the aiAssessmentRevisionRoadmap function.
 * - AiAssessmentRevisionRoadmapOutput - The return type for the aiAssessmentRevisionRoadmap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssessmentRevisionRoadmapInputSchema = z.object({
  examResults: z.string().describe('The exam results of the student.'),
  studentLevel: z.string().describe('The academic level of the student (e.g., BECE, WASSCE, University).'),
  university: z.string().optional().describe('The university the student attends, if applicable.'),
  department: z.string().optional().describe('The department the student belongs to, if applicable.'),
  course: z.string().optional().describe('The course the student is taking, if applicable.'),
});
export type AiAssessmentRevisionRoadmapInput = z.infer<typeof AiAssessmentRevisionRoadmapInputSchema>;

const AiAssessmentRevisionRoadmapOutputSchema = z.object({
  revisionRoadmap: z.string().describe('A personalized revision roadmap for the student.'),
});
export type AiAssessmentRevisionRoadmapOutput = z.infer<typeof AiAssessmentRevisionRoadmapOutputSchema>;

let aiAssessmentRevisionRoadmapFlow: any;

export async function aiAssessmentRevisionRoadmap(input: AiAssessmentRevisionRoadmapInput): Promise<AiAssessmentRevisionRoadmapOutput> {
  if (!aiAssessmentRevisionRoadmapFlow) {
    const prompt = ai.definePrompt({
      name: 'aiAssessmentRevisionRoadmapPrompt',
      model: 'googleai/gemini-2.5-flash',
      input: {schema: AiAssessmentRevisionRoadmapInputSchema},
      output: {schema: AiAssessmentRevisionRoadmapOutputSchema},
      prompt: `You are an AI assessment tool designed to analyze student exam performance and generate personalized revision roadmaps.

  Analyze the following exam results:
  {{examResults}}

  The student is at the {{studentLevel}} level.
  {{#if university}}
  The student attends {{university}}.
  {{/if}}
  {{#if department}}
  The student belongs to the {{department}} department.
  {{/if}}
  {{#if course}}
  The student is taking the {{course}} course.
  {{/if}}

  Based on this information, generate a detailed and actionable revision roadmap for the student, focusing on their weak areas. Be concise and direct.
  Format it in markdown.
  Ensure that the revision roadmap contain links to online revision resources.
  The revision roadmap should cover important areas of improvement, list possible reasons for poor performance and how the student can overcome these issues.
  `,config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      },
    });

    aiAssessmentRevisionRoadmapFlow = ai.defineFlow(
      {
        name: 'aiAssessmentRevisionRoadmapFlow',
        inputSchema: AiAssessmentRevisionRoadmapInputSchema,
        outputSchema: AiAssessmentRevisionRoadmapOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error("The AI model failed to produce a valid response.");
        }
        return output;
      }
    );
  }
  return aiAssessmentRevisionRoadmapFlow(input);
}
