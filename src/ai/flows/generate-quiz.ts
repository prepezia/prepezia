'use server';
/**
 * @fileOverview A flow to generate a quiz from content.
 * - generateQuiz - A function that handles quiz generation.
 * - GenerateQuizInput - The input type.
 * - GenerateQuizOutput - The return type.
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

const GenerateQuizInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space', 'past-question']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
  partNumber: z.number().optional().default(1).describe("For multi-part tests, which part are we generating."),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const QuizQuestionSchema = z.object({
    questionText: z.string().describe("The text of the multiple-choice question."),
    options: z.array(z.string()).min(4).max(4).describe("An array of exactly 4 possible answers for the question."),
    correctAnswer: z.string().describe("The correct answer from the 'options' array."),
    hint: z.string().optional().describe("An optional hint to help the student answer the question if they are stuck."),
    explanation: z.string().describe("A detailed explanation for why the correct answer is correct and the other options are incorrect."),
});

const GenerateQuizOutputSchema = z.object({
  quiz: z.array(QuizQuestionSchema).describe("An array of generated quiz questions."),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateQuizInputSchema},
  output: {schema: GenerateQuizOutputSchema},
  prompt: `You are an AI expert in creating educational assessments. Your task is to generate a comprehensive multiple-choice quiz based on the provided text content.

### INSTRUCTIONS:
1.  Read the content provided below thoroughly.
2.  Generate up to 20 high-quality multiple-choice questions. We use a batch size of 20 to ensure stability and accuracy.
3.  Each question must have exactly 4 options.
4.  For each question, you MUST provide:
    *   **questionText**: The question itself.
    *   **options**: An array of 4 strings representing the possible answers.
    *   **correctAnswer**: The string of the correct answer, which must be one of the provided options.
    *   **hint**: An optional, short hint to guide the student if they are struggling.
    *   **explanation**: A detailed explanation. Explain why the correct answer is right and why the other three options are incorrect.

{{#if partNumber}}
### BATCHING (IMPORTANT):
This is **Part {{partNumber}}** of the material. Each part contains 20 questions. 
If this is Part 2 or higher, you MUST skip the content covered in the previous parts and generate questions for the next section of the text. 
For example, if Part 1 covered the first 20 concepts, Part 2 should cover concepts 21-40.
{{/if}}

{{#if topic}}
### CONTEXT:
This quiz is for a student studying the topic of **"{{{topic}}}"** at the **"{{{academicLevel}}}"** level. The source content is a set of notes or a past exam paper. You are encouraged to include questions that test both direct recall and deep understanding of the concepts.
{{else}}
### CONTEXT:
This quiz must be generated **strictly** from the provided source content from a Study Space. All questions, answers, and explanations must be directly derivable from the text. Do not include information outside of this text.
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

Generate exactly 20 questions if the content allows. Ensure all JSON formatting is perfect.
`,
  config: {
    maxOutputTokens: 16384,
  }
});

const generateQuizFlow = ai.defineFlow({
    name: 'generateQuizFlow',
    inputSchema: GenerateQuizInputSchema,
    outputSchema: GenerateQuizOutputSchema,
  },
  async input => {
    const {output} = await generateQuizPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  return generateQuizFlow(input);
}
