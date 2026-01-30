'use server';
/**
 * @fileOverview A flow to generate a mind map from content.
 * - generateMindMap - A function that handles mind map generation.
 * - GenerateMindMapInput - The input type.
 * - GenerateMindMapOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

export const GenerateMindMapInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

export const GenerateMindMapOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated mind map image."),
  prompt: z.string().describe("The prompt used to generate the image for debugging purposes.")
});
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;

const designMindMapMetaPrompt = ai.definePrompt({
    name: 'designMindMapMetaPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateMindMapInputSchema },
    output: {
        schema: z.object({
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for an image generation model to create a professional and readable mind map. This prompt should describe the central topic, main branches, sub-branches, colors, and flow of information. It MUST include a CRITICAL INSTRUCTION for the image model to ensure all text is perfectly legible, horizontal, and rendered in a clean, sans-serif font.")
        })
    },
    prompt: `You are an expert in visual learning and information design, specializing in creating clear, effective mind maps. Your task is to analyze the provided source content and generate a "meta-prompt" for a text-to-image AI model (like Imagen 4.0) to create a beautiful and readable mind map.

### YOUR DESIGN PRINCIPLES:
1.  **HIERARCHY IS KEY:** Identify the central topic, 3-5 main branches (core ideas), and 2-3 sub-branches for each main branch.
2.  **TEXT CLARITY FIRST:** All text must be concise, high-contrast, horizontal, and use a bold, clean, sans-serif font. Readability is the top priority.
3.  **ORGANIC FLOW:** The layout should be organic, branching out from a central point. Use curved lines to connect nodes. Use different colors for each main branch to improve clarity.
4.  **SIMPLE ICONS:** Suggest a simple, relevant icon for each main branch to add visual appeal and aid recall.

### META-PROMPT REQUIREMENTS:
Analyze the source content and generate a detailed prompt for the image model that follows these rules:
1.  **Central Topic:** Define the central topic clearly in the center of the mind map, enclosed in a circle.
2.  **Main Branches:** Define 3-5 main branches radiating from the center. For each branch, specify its color, a simple icon, and its title (2-4 words).
3.  **Sub-Branches:** For each main branch, specify 2-3 sub-branch nodes with concise text (max 5-7 words).
4.  **The Most Important Instruction:** The meta-prompt MUST end with the following **CRITICAL INSTRUCTION** section, verbatim. This is non-negotiable.

    "**CRITICAL INSTRUCTION FOR TEXT:** This is the most important part of the prompt. All text on this mind map **MUST** be perfectly legible, clear, and easy to read.
    -   Use a bold, modern, sans-serif font.
    -   All text must be perfectly horizontal.
    -   Ensure high contrast between the text and its background.
    -   Do not allow any text to be distorted, curved, misspelled, or unreadable.
    -   Render text as if it were a clean, vector overlay on the image. Prioritize text clarity above all else."
5.  **Branding:** Include a request for a small, discreet 'Learn with Temi' text mark in the bottom-left corner.

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate the meta-prompt for the mind map now.
`,
});

const generateMindMapFlow = ai.defineFlow({
    name: 'generateMindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
},
async (input) => {
    // Step 1: Generate the detailed "meta-prompt" for the image model.
    const { output } = await designMindMapMetaPrompt(input);
    if (!output?.imagePrompt) {
        throw new Error("The AI failed to generate the design prompt for the mind map.");
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

export async function generateMindMap(input: GenerateMindMapInput): Promise<GenerateMindMapOutput> {
  return generateMindMapFlow(input);
}
