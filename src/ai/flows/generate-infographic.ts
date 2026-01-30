
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

// New, simpler summarizer prompt
const summarizerPrompt = ai.definePrompt({
    name: 'infographicSummarizerPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { 
        schema: z.object({ 
            title: z.string().describe("The main, overarching title for the infographic."),
            points: z.array(z.object({
                heading: z.string().describe("A short, 2-3 word heading for a key point."),
                explanation: z.string().describe("A concise one-sentence explanation of the key point."),
                icon_description: z.string().describe("A brief description of a simple, relevant icon for this point (e.g., 'a red blood cell', 'a human kidney').")
            })).max(4).describe("An array of exactly 4 key summary points.")
        }) 
    },
    prompt: `You are an expert research analyst. Your task is to analyze the provided source material and distill it into a title and exactly four essential summary points for an infographic.

### INSTRUCTIONS:
1.  **Analyze the Core Concepts:** Read all the source material to identify the most critical information.
2.  **Create a Main Title:** Formulate a concise but descriptive title for the entire topic.
3.  **Extract Four Key Points:** Identify four distinct, fundamental points. For each point, you must provide:
    *   A very short **heading** (2-3 words).
    *   A single, clear **explanation** sentence.
    *   A simple **icon description** for a relevant visual (e.g., "a human heart with arrows showing blood flow").

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate the title and four key points now.
`,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async (input) => {
    // Step 1: Generate the structured summary from the source content.
    const { output: summary } = await summarizerPrompt(input);
    if (!summary || !summary.points || summary.points.length === 0) {
        throw new Error("The AI failed to generate summary points for the infographic.");
    }
    
    const { title, points } = summary;

    // Step 2: Build a highly detailed, prescriptive prompt for the image model.
    let imagePrompt = `You are an expert infographic designer with over 20 years of experience, known for creating ultra-clear, professional, and visually engaging educational content, similar to the quality of Google's NotebookLM. Your style is minimalist, using a clean white background and a professional color palette.

**CRITICAL INSTRUCTION: ALL TEXT MUST BE PERFECTLY LEGIBLE, HORIZONTAL, and rendered in a clean, sans-serif font like Arial or Helvetica. There must be NO distorted, curved, or unreadable text. Prioritize text clarity above all else.**

Your task is to create a high-quality infographic based on the following content.

The infographic should have the following structure:

1.  **Main Title:** At the top, in a large, bold, black font, display the title: "${title}"

2.  **Content Grid:** Below the title, create a 2x2 grid of four visually distinct modules. Each module must be clearly separated and contain:
    a. A high-quality, relevant icon or illustration.
    b. A clear heading in a bold, dark-colored font.
    c. A short explanation text in a standard, smaller black font.

Here are the specific contents for each of the four modules:
`;

    points.forEach((point, index) => {
        imagePrompt += `
- **Module ${index + 1}:**
  - **Icon:** Create a clean, relevant icon described as: "${point.icon_description}". The icon should be the main focus of the module.
  - **Heading:** "${point.heading}"
  - **Explanation:** "${point.explanation}"
`;
    });

    imagePrompt += `
3.  **Branding:** Include a small, discreet 'Learn with Temi' text mark in the bottom-left corner.
`;


    // Step 3: Use the generated prompt to create the image.
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
