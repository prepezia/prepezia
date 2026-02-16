'use server';
/**
 * @fileOverview A flow to generate flashcards from content.
 * - generateFlashcards - A function that handles flashcard generation.
 * - GenerateFlashcardsInput - The input type.
 * - GenerateFlashcardsOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateFlashcardsInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const FlashcardSchema = z.object({
  front: z.string().describe("The front of the flashcard (a question, term, or concept)."),
  back: z.string().describe("The back of the flashcard (the answer or definition)."),
});

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(FlashcardSchema).describe("An array of generated flashcards."),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

const generateFlashcardsPrompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an AI expert in creating effective study materials. Your task is to generate a set of flashcards based on the provided text content.

### INSTRUCTIONS:
1.  Read the content provided below.
2.  Identify key terms, concepts, definitions, and important facts.
3.  For each key item, create a flashcard with a 'front' and a 'back'.
    *   The 'front' should be a question, a term, or a concept to be defined.
    *   The 'back' should be the corresponding answer, definition, or explanation.
4.  The flashcards should be clear, concise, and focused on a single piece of information.

{{#if topic}}
### CONTEXT:
These flashcards are for a student studying the topic of **"{{{topic}}}"** at the **"{{{academicLevel}}}"** level. The source content is a set of notes.
{{else}}
### CONTEXT:
These flashcards must be generated **strictly** from the provided source content from a Study Space. Do not include information outside of this text.
{{/if}}

### SOURCE CONTENT:
\`\`\`
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}
\`\`\`

Generate the set of flashcards now.
`,
});

const generateFlashcardsFlow = ai.defineFlow({
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    const {output} = await generateFlashcardsPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}
