# **App Name**: Learn with Temi

## Core Features:

- Connect Google Student Account: Allow users to connect their Google student account and input their own Gemini API key or default to the developer's key.
- StudySpace Creation: Allow users to upload PDFs, text files, and MP3 audio to Firebase Storage and input Website URLs and YouTube links to create StudySpaces.
- Interactive Chat with Citations: Build a chat interface (TEMI) powered by Gemini 1.5 Pro/3.0 Flash that answers questions strictly from the uploaded sources. Every AI response must include clickable citations that highlight the source.
- Podcast Generator: Add a 'Generate Podcast' button that uses Google Cloud Text-to-Speech to convert the AI generated 2-person conversation script into a playable MP3 file within the app. The script uses the Temi and Jay system prompt tool.
- Ghana Academic Hub: Note Generator: Allow users to type in a topic and select a level (Beginner / Intermediate / Expert) to generate revision notes in audio, video, graphics etc, using Gemini API.
- Past Question Hub: Implement a timed quiz UI for past questions and a Firestore database for Schools/Departments, from BECE to WASSCE to UNIVERSITY past questions.
- AI Assessment and Roadmap: After an exam, the AI must analyze the student’s weak areas and generate a deep-dive custom 'Revision Roadmap'.
- Firebase Authentication with OTP: Implement Firebase Authentication supporting Google Sign-in and Email/Password with OTP verification (Ghana default).

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to represent knowledge, trust, and professionalism.
- Background color: Very light gray (#F0F0F0) to ensure readability and a clean interface. It's only 20% saturated from the hue of the primary.
- Accent color: Purple (#9C27B0), which is analogous to the primary, to highlight interactive elements and calls to action.
- Body font: 'PT Sans', a modern, friendly sans-serif suitable for clear, readable body text and interface elements.
- Headline font: 'Playfair', a high-contrast serif for headlines, titles, and other prominent text, bringing a touch of elegance and formality to the educational context. Use 'PT Sans' for longer bodies of text. 
- Use clear, professional icons from a consistent set, ensuring they are lightweight and suitable for mid-range Android phones.
- Responsive dashboard with a side-navigation rail and a central workspace suitable for both web and mobile views, with considerations for Capacitor wrapping.
- Use a clean, professional educational theme.