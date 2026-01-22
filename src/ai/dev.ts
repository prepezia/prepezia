'use server';

import { config } from 'dotenv';
config();

import '@/ai/flows/generate-study-notes.ts';
import '@/ai/flows/interactive-chat-with-sources.ts';
import '@/ai/flows/generate-podcast-from-sources.ts';
import '@/ai/flows/ai-assessment-revision-roadmap.ts';
import '@/ai/flows/search-web-for-sources.ts';
import '@/ai/flows/improve-cv.ts';
import '@/ai/flows/career-advisor.ts';
import '@/ai/flows/generate-cv-template.ts';
import '@/ai/flows/search-jobs-flow.ts';
