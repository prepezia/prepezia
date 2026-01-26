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
  backgroundContentType: z.string().optional().describe("The MIME type of the background file."),
  academicObjectives: z.string().describe("The user's stated academic objectives."),
});
export type GetAdmissionsAdviceInput = z.infer<typeof GetAdmissionsAdviceInputSchema>;

const GetAdmissionsAdviceOutputSchema = z.object({
  profileStrengths: z.string().describe("What makes this student a 'strong candidate' right now?"),
  universityShortlist: z.array(z.object({ 
      school: z.string().describe("The name of the university."),
      program: z.string().describe("The specific program at the school."),
      url: z.string().url().describe("A direct, valid link to the program or university's main page."),
      reason: z.string().describe("A brief reason why this school/program is a good fit.")
  })).describe("A list of 3-5 curated universities/programs with a brief 'Why this school?' for each."),
  scholarshipRadar: z.array(z.object({
      name: z.string().describe("The name of the scholarship."),
      url: z.string().url().describe("A direct, valid link to the scholarship's application or information page."),
      description: z.string().describe("A brief description of the scholarship, including key eligibility and benefits."),
  })).describe("A list of 3-5 specific, relevant scholarship opportunities with direct links."),
  admissionsCalendar: z.string().describe("A high-level timeline of when they need to take exams and submit applications, formatted with newlines."),
});
export type GetAdmissionsAdviceOutput = z.infer<typeof GetAdmissionsAdviceOutputSchema>;

export async function getAdmissionsAdvice(input: GetAdmissionsAdviceInput): Promise<GetAdmissionsAdviceOutput> {
  const getAdmissionsAdvicePrompt = ai.definePrompt({
    name: 'getAdmissionsAdvicePrompt',
    model: 'googleai/gemini-2.5-flash',
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
-   THE UNIVERSITY SHORTLIST: Provide 3-5 curated programs. For each, include the school name, the specific program, a direct and valid URL to the program or university's website, and a brief "Why this school?" reason.
-   THE SCHOLARSHIP RADAR: A list of 3-5 specific, relevant scholarship opportunities. For each, provide the scholarship name, a brief description including eligibility, and the direct, valid URL to the information or application page.
-   ADMISSIONS CALENDAR: A high-level timeline of when they need to take exams and submit applications. Use newlines to format the calendar.

**IMPORTANT RULE: Do NOT under any circumstances invent, guess, or create URLs. If you cannot find a real, verifiable URL, do not include that item in the output.** It is better to return fewer results with accurate links than more results with broken links.

User's Background/CV:
\`\`\`
{{#if backgroundDataUri}}{{media url=backgroundDataUri contentType=backgroundContentType}}{{else}}{{{backgroundContent}}}{{/if}}
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
    },
    async input => {
      const {output} = await getAdmissionsAdvicePrompt(input);
      return output!;
    }
  );

  return getAdmissionsAdviceFlow(input);
}
