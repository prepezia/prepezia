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
            mainTitle: z.string().describe("A short, compelling main title for the infographic (max 5 words)."),
            keyPoints: z.array(z.object({
                title: z.string().describe("A concise title for the key point (3-5 words)."),
                explanation: z.string().describe("A clear, one-sentence explanation of the point (10-15 words)."),
                iconDescription: z.string().describe("A detailed description of a relevant icon for this point (e.g., 'A diagram showing red blood cells flowing through a vein', 'A simple icon of a human kidney').")
            })).max(5).describe("An array of up to 5 key points."),
            layoutStyle: z.enum(['vertical list', 'two-column grid']).describe("The best layout style for this content: 'vertical list' for sequential steps, 'two-column grid' for distinct but related points."),
        }) 
    },
    prompt: `
        You are a Senior Content Strategist specializing in data visualization. 
        Your task is to analyze the provided text and distill it into a structured "Visual Blueprint" for an infographic. The goal is maximum clarity and readability.

        ### INSTRUCTIONS:
        1.  **Analyze Content:** Read the source content thoroughly to understand the core message.
        2.  **Extract Main Title:** Create a short, engaging title for the entire infographic.
        3.  **Identify Key Points:** Identify up to 5 of the most critical concepts, steps, or facts.
        4.  **Summarize Points:** For each key point:
            - Write a concise **title** (3-5 words).
            - Write a clear, one-sentence **explanation** (10-15 words).
            - Write a detailed **icon description** that a graphic designer could use to create a relevant and simple visual. Be specific (e.g., "A diagram showing a syringe administering medicine into a red blood cell" instead of just "treatment").
        5.  **Choose Layout:** Decide if a 'vertical list' or a 'two-column grid' is more appropriate for presenting the information clearly.

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

    const imagePrompt = `Create a professional, high-quality infographic with the main title: "${blueprint.mainTitle}".

**Design Rules:**
- STYLE: Clean, modern, minimalist flat design. Use vector-style graphics.
- BACKGROUND: Solid white background (#FFFFFF).
- LAYOUT: A well-structured ${blueprint.layoutStyle} with clear separation between points. Each point should be in its own visual module with a colored background or border.
- COLOR PALETTE: Use a professional and accessible palette. Primary accent colors should be Deep Blue (#3F51B5) and Purple (#9C27B0). Use a dark gray (#333333) for titles and a lighter gray (#666666) for explanation text.
- TEXT: **CRITICAL**: All text must be perfectly legible, horizontal, and rendered in a clean, sans-serif font. There must be NO distorted, curved, or unreadable text. Ensure sufficient contrast between text and background.
- BRANDING: Include a small, discreet 'Learn with Temi' text mark in the bottom-left corner.

**Content Modules:**

${blueprint.keyPoints.map((point, index) => `
---
**Module ${index + 1}:**
- **Icon:** Create a clear, simple, and high-quality icon based on this description: "${point.iconDescription}". The icon should be visually distinct and directly relevant to the text.
- **Title Text:** "${point.title}"
- **Explanation Text:** "${point.explanation}"
---
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
