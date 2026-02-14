
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateInfographicInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;


const GenerateInfographicOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated infographic image."),
  prompt: z.string().describe("The prompt used to generate the image for debugging purposes.")
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

const designInfographicMetaPrompt = ai.definePrompt({
    name: 'designInfographicMetaPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: {
        schema: z.object({
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for an image generation model to create a professional infographic.")
        })
    },
    prompt: `You are an expert infographic designer. Your task is to create a detailed, descriptive prompt for an image generation AI (like Imagen) to produce a visually appealing and highly readable infographic based on the provided source content.

### INSTRUCTIONS:
1.  **Summarize Content:** Break down the source content into 4-6 key points. Each point should have a short title and a one-sentence summary.
2.  **Describe Layout:** Describe a clean, modern layout for the infographic. A 2x2 or 2x3 grid is a good choice. Mention a main title for the infographic.
3.  **Specify Visuals:** For each key point, suggest a simple, clean icon to accompany the text.
4.  **Emphasize Readability:** In your final prompt, you MUST include the following instruction: "All text must be perfectly clear, horizontal, and easy to read. Use a modern sans-serif font."
5.  **Branding:** Include a request for a small, discreet 'Learn with Temi' text mark in the bottom-left corner.

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate a single, coherent prompt for the image model now.
`,
});


const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async (input) => {
    // Step 1: Generate the detailed "meta-prompt" for the image model.
    const { output } = await designInfographicMetaPrompt(input);
    if (!output?.imagePrompt) {
        throw new Error("The AI failed to generate the design prompt for the infographic.");
    }
    const imagePrompt = output.imagePrompt;

    // Step 2: Use the generated prompt to create the image.
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imagePrompt,
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return {
        imageUrl: media.url,
        prompt: imagePrompt, // Return the generated prompt for debugging.
    };
});

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
