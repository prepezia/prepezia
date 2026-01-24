'use server';
/**
 * @fileOverview An AI agent that provides admissions and scholarship advice.
 *
 * - getAdmissionsAdvice - A function that handles the advice process.
 * - GetAdmissionsAdviceInput - The input type for the getAdmissionsAdvice function.
 * - GetAdmissionsAdviceOutput - The return type for the getAdmissionsAdvice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetAdmissionsAdviceInputSchema = z.object({
  backgroundContent: z.string().optional().describe("The user's current CV or background information as plain text."),
  backgroundDataUri: z.string().optional().describe("A data URI of the user's CV file (PDF or text)."),
  academicObjectives: z.string().describe("The user's stated academic objectives."),
});
export type GetAdmissionsAdviceInput = z.infer<typeof GetAdmissionsAdviceInputSchema>;

const GetAdmissionsAdviceOutputSchema = z.object({
  profileStrengths: z.string().describe("What makes this student a 'strong candidate' right now?"),
  universityShortlist: z.array(z.object({ school: z.string(), reason: z.string() })).describe("A list of 5 curated programs with a brief 'Why this school?' for each."),
  scholarshipRadar: z.array(z.string()).describe("A list of 3-5 specific funding bodies the user should investigate."),
  admissionsCalendar: z.string().describe("A high-level timeline of when they need to take exams and submit applications."),
});
export type GetAdmissionsAdviceOutput = z.infer<typeof GetAdmissionsAdviceOutputSchema>;

export async function getAdmissionsAdvice(input: GetAdmissionsAdviceInput): Promise<GetAdmissionsAdviceOutput> {
  const getAdmissionsAdvicePrompt = ai.definePrompt({
    name: 'getAdmissionsAdvicePrompt',
    input: {schema: GetAdmissionsAdviceInputSchema},
    output: {schema: GetAdmissionsAdviceOutputSchema},
    prompt: `You are a Strategic Admissions & Scholarship Advisor. Your expertise is mapping a student's current academic profile to high-value global opportunities.

### STRATEGIC LOGIC:
1.  THE FUNDING FIRST RULE: Always prioritize programs that offer Graduate Assistantships (GA), Teaching Assistantships (TA), or full-ride scholarships.
2.  GEOGRAPHIC ARBITRAGE: Suggest schools in regions that favor the user's specific background (e.g., "Germany for Engineering due to low tuition" or "USA for PhDs due to high funding").
3.  THE "REACH/TARGET/SAFETY" MODEL: Categorize school recommendations based on the user's GPA, research output, and test scores (GRE/GMAT/IELTS).
4.  SCHOLARSHIP MATCHING: Look for specific types of funding: Merit-based, Commonwealth, Fulbright, or Private Foundations.
5.  NARRATIVE THREAD: Look for the 'Narrative Thread.' For example, if a student has a low GPA but high work experience, advise them to write their Statement of Purpose (SOP) focusing on 'Practical Application of Theory.'

### OUTPUT STRUCTURE:
-   PROFILE STRENGTHS: What makes this student a "strong candidate" right now?
-   THE UNIVERSITY SHORTLIST: 5 curated programs with a brief "Why this school?" for each.
-   THE SCHOLARSHIP RADAR: A list of 3-5 specific funding bodies the user should investigate.
-   ADMISSIONS CALENDAR: A high-level timeline of when they need to take exams and submit applications.

User's Background/CV:
\`\`\`
{{#if backgroundDataUri}}{{media url=backgroundDataUri}}{{else}}{{{backgroundContent}}}{{/if}}
\`\`\`

User's Academic Objectives:
\`\`\`
{{{academicObjectives}}}
\`\`\`
`,
  });

  const getAdmissionsAdviceFlow = ai.defineFlow(
    {
      name: 'getAdmissionsAdviceFlow',
      inputSchema: GetAdmissionsAdviceInputSchema,
      outputSchema: GetAdmissionsAdviceOutputSchema,
      retries: 3,
    },
    async input => {
      const {output} = await getAdmissionsAdvicePrompt(input);
      return output!;
    }
  );

  return getAdmissionsAdviceFlow(input);
}
