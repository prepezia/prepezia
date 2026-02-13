
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating study notes based on a topic and academic level.
 *
 * - generateStudyNotes - The main function to generate study notes.
 * - GenerateStudyNotesInput - The input type for the generateStudyNotesInput function.
 * - GenerateStudyNotesOutput - The output type for the generateStudyNotesOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudyNotesInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate study notes.'),
  academicLevel: z
    .enum([
        'Beginner', 
        'Intermediate', 
        'Expert', 
        'Secondary', 
        'Undergraduate', 
        'Masters', 
        'PhD',
        'Junior High (JHS/BECE)',
        'Senior High (SHS/WASSCE)',
        'Postgraduate (Masters/PhD)',
        'Professional',
        'Other'
    ])
    .describe('The academic level of the study notes.'),
});

export type GenerateStudyNotesInput = z.infer<typeof GenerateStudyNotesInputSchema>;

// Schema for the model's output, allowing for some flexibility
const PromptOutputSchema = z.object({
  notes: z.string().describe('The generated study notes in various formats.'),
  nextStepsPrompt: z.string().optional().describe('A question prompting the user for next steps like generating a quiz or flashcards.')
});

// Strict schema for the flow's final output, ensuring frontend gets what it expects
const GenerateStudyNotesOutputSchema = z.object({
  notes: z.string().describe('The generated study notes in various formats.'),
  nextStepsPrompt: z.string().describe('A question prompting the user for next steps like generating a quiz or flashcards.')
});

export type GenerateStudyNotesOutput = z.infer<typeof GenerateStudyNotesOutputSchema>;

let generateStudyNotesFlow: any;

export async function generateStudyNotes(
  input: GenerateStudyNotesInput
): Promise<GenerateStudyNotesOutput> {
  if (!generateStudyNotesFlow) {
    const generateStudyNotesPrompt = ai.definePrompt({
      name: 'generateStudyNotesPrompt',
      model: 'googleai/gemini-2.5-flash',
      input: {schema: GenerateStudyNotesInputSchema},
      output: {schema: PromptOutputSchema}, // Use the flexible schema for model output
      system: "You are an expert tutor and academic author. Your signature skill is creating exceptionally detailed, comprehensive, and well-structured study materials that students can rely on for their exams. You are known for your clarity and depth.",
      prompt: `Generate **extremely detailed and comprehensive** study notes for the topic: {{{topic}}}.
The academic level is: {{{academicLevel}}}.

The notes must be thorough enough for a student to use as a **primary study resource**. Cover all key concepts, sub-topics, important definitions, historical context, critical analyses, and relevant examples. Assume the student has no other material and needs a complete understanding from these notes alone.

### Content Requirements:
1.  **Structure and Depth:** Use a clear, logical hierarchy with Markdown headings (#, ##, ###), subheadings, bullet points, and bold text. Start with an introduction, progress through the topic systematically, and end with a conclusion or summary.
2.  **Mandatory Page Breaks for Length:** The notes MUST be substantial. To manage this length, you **must** break up the content into multiple pages for readability. To do this, insert a horizontal rule (\`---\`) on its own line to indicate a page break. You MUST use at least 2-3 page breaks to ensure the content is comprehensive.
3.  **Rich Formatting:** Utilize Markdown tables for comparisons or data. Ensure all scientific or mathematical notations (like H₂O or E=mc²) are correctly formatted. Use blockquotes for important quotes or principles.
4.  **Accuracy and Clarity:** The notes must be factually accurate, easy to understand, and precisely tailored to the selected academic level. Define key terms as they are introduced.
5.  **Next Steps**: After generating the notes, formulate an engaging question for the user about what they would like to do next. For example: "Now that you have your notes, would you like me to generate flashcards to test your knowledge, a quiz to check your understanding, or a slide deck to present the key points?" and place it in the 'nextStepsPrompt' field.`,
      config: {
          maxOutputTokens: 8192,
      },
    });

    generateStudyNotesFlow = ai.defineFlow(
      {
        name: 'generateStudyNotesFlow',
        inputSchema: GenerateStudyNotesInputSchema,
        outputSchema: GenerateStudyNotesOutputSchema, // The flow guarantees the strict output schema
      },
      async (input: GenerateStudyNotesInput) => {
        const {output} = await generateStudyNotesPrompt(input);
        if (!output || !output.notes) {
            throw new Error("Failed to generate study notes text.");
        }

        // If the model forgets the prompt, provide a default.
        const nextSteps = output.nextStepsPrompt || "Now that you have your notes, would you like to generate flashcards, a quiz, or a slide deck?";

        return {
            notes: output.notes,
            nextStepsPrompt: nextSteps,
        };
      }
    );
  }
  return generateStudyNotesFlow(input);
}
