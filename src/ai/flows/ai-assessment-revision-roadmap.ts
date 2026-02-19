'use server';

/**
 * @fileOverview Generates a personalized revision roadmap based on student's exam performance.
 *
 * - aiAssessmentRevisionRoadmap - A function that handles the generation of revision roadmap.
 * - AiAssessmentRevisionRoadmapInput - The input type for the aiAssessmentRevisionRoadmap function.
 * - AiAssessmentRevisionRoadmapOutput - The return type for the aiAssessmentRevisionRoadmap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiAssessmentRevisionRoadmapInputSchema = z.object({
  examResults: z.string().describe('The exam results of the student.'),
  studentLevel: z.string().describe('The academic level of the student (e.g., BECE, WASSCE, University).'),
  university: z.string().optional().describe('The university the student attends, if applicable.'),
  department: z.string().optional().describe('The department the student belongs to, if applicable.'),
  course: z.string().optional().describe('The course the student is taking, if applicable.'),
});
export type AiAssessmentRevisionRoadmapInput = z.infer<typeof AiAssessmentRevisionRoadmapInputSchema>;

const AiAssessmentRevisionRoadmapOutputSchema = z.object({
  revisionRoadmap: z.string().describe('A personalized revision roadmap for the student.'),
});
export type AiAssessmentRevisionRoadmapOutput = z.infer<typeof AiAssessmentRevisionRoadmapOutputSchema>;

let aiAssessmentRevisionRoadmapFlow: any;

export async function aiAssessmentRevisionRoadmap(input: AiAssessmentRevisionRoadmapInput): Promise<AiAssessmentRevisionRoadmapOutput> {
  if (!aiAssessmentRevisionRoadmapFlow) {
    const prompt = ai.definePrompt({
      name: 'aiAssessmentRevisionRoadmapPrompt',
      model: 'googleai/gemini-2.5-flash',
      input: {schema: AiAssessmentRevisionRoadmapInputSchema},
      output: {schema: AiAssessmentRevisionRoadmapOutputSchema},
      prompt: `You are Prepezia's expert AI Revision Tutor. Your task is to analyze a student's exam performance and generate a highly personalized, actionable revision roadmap.

  ### Student Context:
  - **Exam Results**: {{examResults}}
  - **Level**: {{studentLevel}}
  {{#if university}}- **Institution**: {{university}}{{/if}}
  {{#if course}}- **Course**: {{course}}{{/if}}

  ### Critical Instructions:
  1.  **NO EXTERNAL APPS**: Do NOT recommend third-party apps like Anki, Quizlet, Khan Academy, or Evernote.
  2.  **RECOMMEND PREPEZIA TOOLS**: For every weak area identified, strongly suggest using Prepezia's built-in features:
      - **Note Generator**: Use this to create extremely detailed notes on topics you struggled with.
      - **Study Spaces**: Create a dedicated space for this subject, upload your lecture slides, and chat with Zia to clarify difficult concepts.
      - **AI Flashcards & Quizzes**: Generate these from your notes or study spaces within Prepezia to practice active recall.
      - **AI Podcasts**: Use the "Generate Podcast" feature in Prepezia to listen to conversational summaries while on the go.
  3.  **Actionable Steps**: Provide specific, step-by-step instructions on how to use Prepezia's tools to improve.
  4.  **Tone**: Professional, encouraging, and high-agency.
  5.  **Structure**:
      - **Performance Analysis**: A brief breakdown of what the score indicates.
      - **Key Areas for Improvement**: Specific topics the student needs to focus on.
      - **Why You Might Have Struggled**: Common pitfalls based on the performance.
      - **Prepezia Revision Strategy**: Detailed steps using Prepezia's features.
      - **Recommended Web Resources**: Links to high-quality academic sites or videos (no competing apps).

  Generate the complete roadmap in Markdown format now.`,
      config: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH',
          },
        ],
      },
    });

    aiAssessmentRevisionRoadmapFlow = ai.defineFlow(
      {
        name: 'aiAssessmentRevisionRoadmapFlow',
        inputSchema: AiAssessmentRevisionRoadmapInputSchema,
        outputSchema: AiAssessmentRevisionRoadmapOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error("The AI model failed to produce a valid response.");
        }
        return output;
      }
    );
  }
  return aiAssessmentRevisionRoadmapFlow(input);
}
