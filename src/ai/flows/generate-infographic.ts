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


const infographicSummaryPrompt = ai.definePrompt({
    name: 'infographicSummaryPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { 
        schema: z.object({ 
            mainTitle: z.string().describe("Short, compelling main title for the infographic (max 5 words)."),
            keyPoints: z.array(z.object({
                header: z.string().describe("Extremely short header for a key point (2-3 words)."),
                body: z.string().describe("A very short body phrase (max 5 words)."),
                iconName: z.string().describe("A simple, descriptive name for an icon representing this point (e.g., 'DNA Strand', 'Lightbulb').")
            })).max(4).describe("An array of up to 4 key points."),
            layoutStyle: z.enum(['grid', 'flow-chart']).describe("The best layout style for this content: 'grid' for distinct points, 'flow-chart' for a process."),
        }) 
    },
    prompt: `
        You are a Senior Content Strategist specializing in data visualization. 
        Your task is to analyze the provided text and distill it into a structured "Visual Blueprint" for an infographic.

        ### INSTRUCTIONS:
        1.  **Analyze Content:** Read the source content thoroughly.
        2.  **Extract Core Ideas:** Identify up to 4 of the most critical concepts or steps.
        3.  **Aggressively Summarize:** For each concept, create an extremely short header (2-3 words) and a body phrase (max 5 words).
        4.  **Suggest Icons:** For each concept, suggest a simple, clear icon name.
        5.  **Choose Layout:** Decide if a 'grid' or a 'flow-chart' layout is more appropriate.

        ### SOURCE CONTENT:
        {{#if content}}
            {{{content}}}
        {{else}}
            {{#each sources}}
                - {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
            {{/each}}
        {{/if}}
    `,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async input => {
    const { output: blueprint } = await infographicSummaryPrompt(input);
    if (!blueprint) throw new Error("Visual Blueprint generation failed.");

    const imagePrompt = `
        A professional, high-quality infographic with the main title "${blueprint.mainTitle}".
        STYLE: Modern, minimalist, flat 2D design.
        BACKGROUND: Clean white background (#FFFFFF).
        BRANDING: Include a small, discreet 'Learn with Temi' text mark in the bottom-left corner.
        TEXT: All text MUST be perfectly legible, horizontal, and rendered in a clean sans-serif font. NO distorted or unreadable text.
        COLOR PALETTE: Use a professional palette with Deep Blue (#3F51B5) and Purple (#9C27B0) as primary accent colors against the white background.
        
        LAYOUT: A ${blueprint.layoutStyle} layout.

        ${blueprint.keyPoints.map((point, index) => `
        MODULE ${index + 1}:
        - ICON: A simple, clear icon representing "${point.iconName}".
        - HEADER: The text "${point.header}".
        - BODY: The text "${point.body}".
        `).join('\n')}
    `;

    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imagePrompt,
    });

    if (!media?.url) throw new Error('Image generation failed.');

    return {
        imageUrl: media.url,
        prompt: imagePrompt,
    };
});

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
