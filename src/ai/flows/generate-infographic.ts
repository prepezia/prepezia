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
  style: z.enum(['modern', 'minimalist', 'colorful', 'corporate', 'educational']).optional().default('educational').describe("Visual style preference"),
  maxPoints: z.number().min(3).max(8).optional().default(5).describe("Number of key points to include"),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;

const GenerateInfographicOutputSchema = z.object({
  imageDataUrl: z.string().describe("A data URI of the generated infographic image."),
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

const extractKeyPointsPrompt = ai.definePrompt({
    name: 'extractKeyPointsPrompt',
    model: 'googleai/gemini-1.5-pro',
    input: {
        schema: z.object({
            content: z.string().optional(),
            sources: z.array(SourceSchema).optional(),
            maxPoints: z.number().default(5),
            academicLevel: z.string().optional(),
        })
    },
    output: {
        format: 'json',
        schema: z.array(z.object({
            title: z.string(),
            summary: z.string()
        }))
    },
    prompt: `Extract the {{{maxPoints}}} most important, distinct key points from the following content. Each point must have a very short, catchy title (2-3 words) and a concise one-sentence summary (max 15 words).

Academic Level: {{{academicLevel}}}
Content:
{{#if content}}
{{{content}}}
{{else}}
    {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
    {{/each}}
{{/if}}

Return ONLY the JSON array of objects, with keys "title" and "summary". Do not add any other text or commentary.`
});


// Flow 1: Extract key points from content
const extractKeyPointsFlow = ai.defineFlow({
  name: 'extractKeyPointsFlow',
  inputSchema: z.object({
    content: z.string().optional(),
    sources: z.array(SourceSchema).optional(),
    maxPoints: z.number().default(5),
    academicLevel: z.string().optional(),
  }),
  outputSchema: z.array(z.object({
    title: z.string(),
    summary: z.string()
  })),
}, async (input) => {
  const { output } = await extractKeyPointsPrompt(input);
  if (!output || !Array.isArray(output) || output.length === 0) {
    throw new Error("The AI model failed to extract key points in the expected format.");
  }
  return output as any;
});


// Main flow that orchestrates the steps
export const generateInfographic = ai.defineFlow({
    name: 'generateInfographic',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
}, async (input) => {
    // Step 1: Extract key points using the text model
    const keyPoints = await extractKeyPointsFlow(input);

    // Step 2: Build the detailed prompt for the image model
    const topic = input.topic || 'Key Insights';
    const keyPointsText = keyPoints.map((p, i) => `Point ${i + 1} Title: ${p.title}\nPoint ${i + 1} Summary: ${p.summary}`).join('\n\n');

    const imagePrompt = `You are an expert graphic designer. Create a clean, modern, professional infographic with a vertical A4-style layout.
    
**CRITICAL INSTRUCTION:** You **MUST** use the following text VERBATIM. Do not change, add, or remove any words from the provided title and summaries. Render the text perfectly and legibly.

**Main Title:** ${topic}

**Key Points to Include:**
${keyPointsText}

**Design Guidelines:**
- Visual Style: ${input.style || 'educational'}. Use a professional and minimal color palette.
- For each key point, create a simple, relevant icon or illustration.
- Ensure all text is perfectly readable against the background. The typography must be clean and professional.
- Add a small, unobtrusive "Prepezia" logo or text at the very bottom, centered.
- The overall design should be high-quality and suitable for a presentation or study guide.
`;

    // Step 3: Generate the single infographic image using the image model
    const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-image',
        prompt: imagePrompt,
        config: {
            responseModalities: ['TEXT', 'IMAGE'], // 'TEXT' is required for this model, even if we only need the image
        },
    });

    if (!media || !media.url) {
        throw new Error("The AI failed to generate an infographic image.");
    }
    
    return { imageDataUrl: media.url };
});
