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
3.  **Layout & Vertical Density (CRITICAL):**
    *   Create a clean, professional, single-column layout.
    *   **MAXIMIZE SPACE EFFICIENCY:** Use \`leading-snug\` for text. Do not use excessive whitespace. Use \`mt-4\` or \`mt-5\` for major section headers instead of large gaps.
    *   Use a standard A4 paper aspect ratio in your design thinking. Use sans-serif fonts.
4.  **Content Conversion:**
    *   Convert Markdown headings, lists, bold, and italic text into the appropriate HTML tags.
    *   Parse the user's contact information (name, email, phone, LinkedIn) and display it prominently at the top.
    *   Structure the CV with clear sections (e.g., Summary, Experience, Education, Skills).
5.  **Colors:** Use a professional and minimal color palette. Use shades of gray for text (e.g., \`text-gray-900\`, \`text-gray-600\`) and a subtle accent color for headings.
6.  **No External Dependencies:** The final HTML should not require any external CSS or JavaScript files.
7.  **Advanced Page Break Logic & Margins (CRITICAL):**
    *   **TOP MARGIN PROTECTION:** For every major section (e.g., 'Experience', 'Education'), ensure it has a consistent top padding (e.g., \`pt-4\`). This ensures that if a section starts at the top of a new page, it isn't "stuck" to the top edge of the paper.
    *   **AVOID SPLITTING ENTRIES:** Wrap EVERY specific job entry, education degree, or project item in its OWN \`<div>\` with the Tailwind class \`break-inside-avoid\`. This prevents a single paragraph or job description from being split across two pages.
    *   Apply \`break-after-avoid\` to all headings to ensure they stay with their content.

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
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function designCv(input: DesignCvInput): Promise<DesignCvOutput> {
    return designCvFlow(input);
}
