'use server';

/**
 * @fileOverview An AI agent that designs a professional CV from Markdown text.
 *
 * - designCv - A function that handles the CV design process.
 * - DesignCvInput - The input type for the designCv function.
 * - DesignCvOutput - The return type for the designCv function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const DesignCvInputSchema = z.object({
  cvMarkdown: z.string().describe("The user's full CV content in Markdown format."),
});
export type DesignCvInput = z.infer<typeof DesignCvInputSchema>;

const DesignCvOutputSchema = z.object({
  cvHtml: z.string().describe("A single string containing the full HTML of the designed CV, styled with Tailwind CSS classes."),
});
export type DesignCvOutput = z.infer<typeof DesignCvOutputSchema>;

const designCvPrompt = ai.definePrompt({
  name: 'designCvPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: DesignCvInputSchema},
  output: {schema: DesignCvOutputSchema},
  prompt: `You are an expert web developer and UI designer who specializes in creating professional, modern CVs using HTML and Tailwind CSS.

Your task is to convert the user's CV from Markdown into a single, self-contained HTML document.

### REQUIREMENTS:
1.  **Output Format:** The entire output must be a single HTML string.
2.  **Styling:** You MUST use Tailwind CSS classes directly in the HTML elements. Do not use inline \`style\` attributes or a \`<style>\` block. The final app uses Tailwind, so these classes will be rendered correctly.
3.  **Layout:**
    *   Create a clean, professional, single-column layout.
    *   Use a standard A4 paper aspect ratio in your design thinking.
    *   Pay attention to typography, spacing, and visual hierarchy. Use sans-serif fonts.
4.  **Content Conversion:**
    *   Convert Markdown headings, lists, bold, and italic text into the appropriate HTML tags.
    *   Parse the user's contact information (name, email, phone, LinkedIn) and display it prominently at the top.
    *   Structure the CV with clear sections (e.g., Summary, Experience, Education, Skills).
5.  **Colors:** Use a professional and minimal color palette. Use shades of gray for text (e.g., \`text-gray-900\`, \`text-gray-600\`) and a subtle accent color for headings or links if needed.
6.  **No External Dependencies:** The final HTML should not require any external CSS or JavaScript files.

### USER'S CV (Markdown):
\`\`\`markdown
{{{cvMarkdown}}}
\`\`\`

Produce the HTML code now.`,
});

const designCvFlow = ai.defineFlow(
  {
    name: 'designCvFlow',
    inputSchema: DesignCvInputSchema,
    outputSchema: DesignCvOutputSchema,
  },
  async input => {
    const {output} = await designCvPrompt(input);
    return output!;
  }
);

export async function designCv(input: DesignCvInput): Promise<DesignCvOutput> {
    return designCvFlow(input);
}
