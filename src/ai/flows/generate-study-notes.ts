'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating study notes based on a topic and academic level.
 *
 * - generateStudyNotes - The main function to generate study notes.
 * - GenerateStudyNotesInput - The input type for the generateStudyNotes function.
 * - GenerateStudyNotesOutput - The output type for the generateStudyNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudyNotesInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate study notes.'),
  academicLevel: z
    .enum(['Beginner', 'Intermediate', 'Expert'])
    .describe('The academic level of the study notes.'),
});

export type GenerateStudyNotesInput = z.infer<typeof GenerateStudyNotesInputSchema>;

const GenerateStudyNotesOutputSchema = z.object({
  notes: z.string().describe('The generated study notes in various formats.'),
});

export type GenerateStudyNotesOutput = z.infer<typeof GenerateStudyNotesOutputSchema>;

let generateStudyNotesFlow: any;

export async function generateStudyNotes(
  input: GenerateStudyNotesInput
): Promise<GenerateStudyNotesOutput> {
  if (!generateStudyNotesFlow) {
    const generateStudyNotesPrompt = ai.definePrompt({
      name: 'generateStudyNotesPrompt',
      input: {schema: GenerateStudyNotesInputSchema},
      output: {schema: GenerateStudyNotesOutputSchema},
      prompt: `You are an expert tutor, skilled in generating study notes for any given topic and academic level.

  Generate study notes for the topic: {{{topic}}}.
  The academic level is: {{{academicLevel}}}.

  The study notes should be in various formats, including text, audio, video, and graphics, as appropriate for the topic and level.
  Include links to resources for audio, video and graphics.
  The generated notes should be well-organized, accurate, and easy to understand. Focus on quality content over length.`,
    });

    generateStudyNotesFlow = ai.defineFlow(
      {
        name: 'generateStudyNotesFlow',
        inputSchema: GenerateStudyNotesInputSchema,
        outputSchema: GenerateStudyNotesOutputSchema,
        retries: 3,
      },
      async input => {
        const {output} = await generateStudyNotesPrompt(input);
        return output!;
      }
    );
  }
  return generateStudyNotesFlow(input);
}
