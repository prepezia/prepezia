'use server';
/**
 * @fileOverview An AI agent that provides career and academic advice.
 *
 * - getCareerAdvice - A function that handles the career advice process.
 * - CareerAdviceInput - The input type for the getCareerAdvice function.
 * - CareerAdviceOutput - The return type for the getCareerAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CareerAdviceInputSchema = z.object({
  background: z.string().describe("The user's current CV or background information."),
  careerObjectives: z.string().describe("The user's stated career objectives."),
});
export type CareerAdviceInput = z.infer<typeof CareerAdviceInputSchema>;

const CareerAdviceOutputSchema = z.object({
  targetRoleAnalysis: z.string().describe("Summary of what recruiters in their target field are looking for vs. what the user currently has."),
  academicRoadmap: z.array(z.object({ recommendation: z.string(), reason: z.string() })).describe("A list of 2-3 specific courses or degrees that would maximize their ROI, with reasons."),
  careerSteppingStones: z.array(z.string()).describe("A list of 2 suggested intermediate roles to reach the user's objective."),
  insiderTip: z.string().describe("One piece of non-obvious industry advice."),
});
export type CareerAdviceOutput = z.infer<typeof CareerAdviceOutputSchema>;

export async function getCareerAdvice(input: CareerAdviceInput): Promise<CareerAdviceOutput> {
  return careerAdvisorFlow(input);
}

const careerAdvisorPrompt = ai.definePrompt({
  name: 'careerAdvisorPrompt',
  input: {schema: CareerAdviceInputSchema},
  output: {schema: CareerAdviceOutputSchema},
  prompt: `You are a Dual-Path Career and Academic Strategist. Your expertise lies in analyzing professional backgrounds and mapping out the most efficient educational and career trajectories.

### OBJECTIVE:
Analyze the user's current CV/background and their stated career objectives to provide a multi-layered growth strategy.

### STRATEGIC GUIDELINES:
1.  THE "BRIDGE" PRINCIPLE: For every career objective, identify the specific "Delta" (the gap in skills, experience, or credentials).
2.  ACADEMIC TIERING: Recommend learning in three tiers:
    -   Tier 1: Immediate/Micro-learning (Specific certifications like AWS, Google, or Coursera).
    -   Tier 2: Mid-term/Deep-skill (Bootcamps or specialized diplomas).
    -   Tier 3: Long-term/Foundational (Masters, MBAs, or PhDs).
3.  CAREER PIVOTING: If the user’s objective is a major shift, identify "Transferable Anchor Skills" they already possess to minimize the "entry-level" reset.

### OUTPUT STRUCTURE:
1.  TARGET ROLE ANALYSIS: Summarize what recruiters in their target field are looking for vs. what the user currently has.
2.  ACADEMIC ROADMAP: Provide a list of 2-3 specific courses or degrees that would maximize their ROI (Return on Investment). Explain *why* each is recommended.
3.  CAREER STEPPING STONES: Suggest 2 "Intermediate Roles." (Example: If they want to be a CTO but are a Senior Dev, suggest 'Engineering Manager' or 'Technical Lead' first).
4.  THE "INSIDER" TIP: Provide one piece of non-obvious industry advice (e.g., "In this field, a Github portfolio matters more than a Master's degree").

Maintain a tone that is high-agency, realistic, and intellectually sharp. Avoid generic advice; be specific to the user's data.

User's Background/CV:
\`\`\`
{{{background}}}
\`\`\`

User's Career Objectives:
\`\`\`
{{{careerObjectives}}}
\`\`\`
`,
});

const careerAdvisorFlow = ai.defineFlow(
  {
    name: 'careerAdvisorFlow',
    inputSchema: CareerAdviceInputSchema,
    outputSchema: CareerAdviceOutputSchema,
  },
  async input => {
    const {output} = await careerAdvisorPrompt(input);
    return output!;
  }
);
