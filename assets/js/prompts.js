'use strict';
/* Built-in prompt templates for the AI content studio.
   {{placeholders}} are filled from the chosen lesson — see PLACEHOLDERS in ai.js. */

const BUILTIN_PROMPTS = [
  {
    id: 'tpl-isl-package',
    name: 'ISL Qatar — Complete Lesson Package (master prompt)',
    text: `ISL Qatar Mathematics — Complete {{level}} Lesson Package Master Prompt

You are an expert MYP3/MYP4/MYP5/DP Maths mathematics teacher, curriculum designer, LaTeX author and presentation designer. Using the teacher inputs below, create a coherent, ready-to-teach sequence for students who benefit from explicit instruction, small steps and repeated practice.

Inputs
Topic and subtopics: {{topic}} {{code}}
Unit / strand: {{unit}}
Number of lessons: {{lessons}}
Minutes per lesson: {{duration}}
Course: {{level}} (class: {{class}})
Prior knowledge or diagnostic gaps: {{prior}}
Learning objectives or assessment criteria:
{{outcomes}}
Available homework time: {{homework}}
School logo: [ATTACH IF AVAILABLE; do not invent]
Additional notes from the teacher: {{extra}}

If an optional input is absent, make a sensible assumption and state it in the Teacher Pack. For multiple lessons, produce distinct materials for each lesson. If the content is too broad, teach essential ideas first and distribute or defer the rest.

Plan and alignment
Before producing materials, identify prerequisite skills, key vocabulary, concepts, likely misconceptions, common calculation errors, difficulty progression and the evidence needed to move on. Show an alignment table for each lesson:
- Objective
- Before-lesson preparation
- Class modelling and practice
- After-lesson questions
- Exit-ticket evidence
Use the same notation, method and vocabulary in all documents. Homework should test taught material; any optional extension that introduces a new method must include enough support.

For each lesson follow Starter → Prerequisite Check → I DO → Mini-Whiteboard Check 1 → WE DO → Mini-Whiteboard Check 2 → YOU DO → Check for Understanding → Exit Ticket. Use retrieval, worked examples, gradual release, visual organisation and frequent checks. Questions begin very accessibly and progress gradually to {{level}} standard. Provide a minute-by-minute table with columns Time | Stage | Teacher action | Student action | Resource/page/slide | Evidence/decision. Stage durations must add up exactly to the lesson length, including transition and feedback time.

1. Before-Lesson Preparation — student document
Create a separate Lesson_XX_Preparation.tex and .pdf for every lesson. Students complete this independently before class in about 10–15 minutes. Prepare prerequisite knowledge without trying to teach the entire new topic.
Include: purpose and estimated time; instructions for getting unstuck; 2–4 retrieval questions; a short Remember box with essential notation or facts; one fully worked prerequisite example explaining each step; a helpful representation or comparison where appropriate; 2–4 short Try It items with working space; one prediction or notice/wonder question bridging to the new topic; and a self-check (“I can do this / I need help with this / My question for class”).
The preparation must work without websites, videos, paid platforms or adult help. Put its answers and a two-minute plan to respond to common errors in the separate teacher Answer Key. Include a starter entry point for students who did not complete preparation. No answers in the student document.

2. In-Class Deep-Understanding Worksheet — student document
Create Lesson_XX_Class_Worksheet.tex and .pdf for every lesson. Design this to build understanding and method, rather than offering question repetition alone. Align sections to the timed lesson plan and slides.
Include: objective and student-friendly success criteria; key vocabulary and concise definitions; 4–6 prerequisite starter questions; a conceptual Notice/Why prompt tied to a representation if useful; at least two I DO worked examples with reasons and room to annotate; 2–4 WE DO examples with support gradually removed; a Support Box (visual, first step, method, sentence stem or formula, without giving the final answer); independent YOU DO tasks; a Spot the Mistake activity asking for the first error, explanation and correction; at least one justification or multiple-representation task; and a 3–5 item exit ticket (basic, core and slight transfer).
Scale independent practice to actual class time. As a guide: Foundation 6–10, Core 6–10, Apply 3–5, Challenge 2–3. Begin with small numbers and accessible questions. Include enough practice for students with gaps; challenge is optional after core work. Mark together/independent sections clearly. Provide genuine working space, readable layout and sensible page breaks. Student pages contain no answers or teacher commentary; provide complete teacher solutions separately.

3. After-Lesson Practice and Self-Test — student document
Create Lesson_XX_After_Lesson_Practice.tex and .pdf for every lesson. It may be used as homework or post-lesson practice. State estimated time, required items and optional challenge. Organise questions into levels without labelling students:
- Easy — Build confidence: about 4–6 familiar, direct uses of the taught method.
- Medium — Show understanding: about 4–6 variations, mixed representations or short explanations.
- Hard — Apply and reason: about 2–4 contextual, reverse, unfamiliar or error-analysis problems, including justification. These may be optional when time is short.
Make difficulty change through mathematical thinking, not only larger numbers. Add one retrieval question from a previous lesson when appropriate, a three-item mixed self-test, and a reflection (“I can do independently / I need to practise / My question”). State which questions to attempt if time is limited. Never include answers in student pages. In the Answer Key, provide complete worked solutions to every level and the self-test; these can be released to students later.

4. Editable Teacher Presentation
Create an actual editable Lesson_XX_Teacher_Slides.pptx for every lesson and export a matching PDF preview. A slide outline alone does not meet this requirement. Use large, legible text, high contrast, sparse wording, correct notation and clear diagrams; do not convey meaning by colour alone. Use no fabricated school logo. Reveal worked steps and answers only after students have thought or responded.
Slide sequence: (1) title/objective/success criteria; (2) starter and separate answer/reveal; (3) link to preparation and quick prerequisite response; (4) vocabulary/concept visual; (5) at least two stepped I DO examples; (6) Mini-Whiteboard Round 1; (7) 2–4 WE DO examples with fading support; (8) Mini-Whiteboard Round 2; (9) YOU DO instructions with worksheet references and timing; (10) Spot the Mistake and its correction; (11) exit ticket; (12) recap and next step. Adjust slide count to the lesson duration; a round may span multiple slides.
For both mini-whiteboard rounds, include about five questions: very easy, easy, similar, variation, deliberate misconception. Put answers on separate reveal slides or in presenter notes. Every substantive slide needs presenter notes: what to say, ask, expect and watch for, plus the relevant worksheet page/question. Slides guide teaching and show selected examples, rather than copying the entire worksheet.
If PPTX generation is unavailable, supply complete slide-by-slide content and presenter notes in an editable source document, explicitly identify the missing PPTX, and never claim it was created.

Teacher Pack
Create Teacher_Pack.tex and .pdf with a clearly marked section for each lesson: objectives, success criteria, prerequisite analysis, vocabulary, resources, exact timing, preparation follow-up, slide/worksheet cross-references, board plan, teaching script, differentiation, misconceptions and next-lesson decisions.
For each teaching point provide SAY (simple and precise), WRITE (exact board text), ASK, EXPECT, WATCH FOR and IF STUDENTS STRUGGLE. The board plan uses concise sections: title, objective, vocabulary, Remember, numbered method, worked examples, common mistake and Your Turn. Model at least two examples for each new concept, making the reason for each step visible and checking results.
For both mini-whiteboard rounds provide question, answer, misconception/check and a response if many miss it. Routine: “Boards down → work independently → show in 3, 2, 1 → do not erase → scan all boards.” Give a decision threshold (for example, approximately 80% correct), a 2–5 minute reteach if below threshold and another short check. For 2–4 WE DO examples provide teacher prompts, expected student responses and full solutions with decreasing support. Include at least four topic-specific misconceptions in a table: Misconception | Example | Diagnosis | Teacher response.
Interpret the exit ticket by the essential objective. Give actions for most students secure, about half struggling and most struggling, identifying what prerequisite or concept to revisit. A colleague should be able to teach directly from this pack.
Also create Mini_Whiteboard_Reference.tex and .pdf: a concise teacher reference with both rounds in teaching order, answers, purpose and reteach prompts; one page per lesson where possible.

Answer Key
Create Answer_Key.tex and .pdf. Separate by lesson and by Preparation, Starter, Mini-whiteboards, I DO/WE DO, Class Worksheet, Error Analysis, Exit Ticket, After-Lesson Practice, Self-Test. Show intermediate steps and acceptable alternative methods. Check arithmetic, units, domain restrictions, rounding and notation. Question identifiers and answers must correspond exactly to the student documents.

Typesetting and delivery
Provide complete, compilable A4 LaTeX for each text document. Useful standard packages: geometry, amsmath, amssymb, enumitem, tcolorbox, tabularx, multicol, fancyhdr. Use proper mathematical notation, readable spacing, working space and logical page breaks. Use Lesson_01, Lesson_02, etc. consistently in filenames and references. Do not leave placeholders in final teaching materials.
Compile every .tex, fix errors and visually inspect PDFs for clipping, missing symbols, dense pages and accidental student-facing answers. Generate and visually inspect the PPTX and PDF preview where possible. Supply links to all generated PDFs, editable PPTX files and editable source files; do not provide LaTeX alone when file creation is available. If a tool limitation prevents an output, name precisely what was not produced and give the best complete editable substitute.
Before finishing, verify: exact timing; feasible workload; accessible preparation; conceptual progression in class; meaningful Easy/Medium/Hard practice; correct answers; alignment of slides and question numbers; appropriate mini-whiteboard teaching decisions; adequate working space; no answer leakage; and all files open and render correctly. Revise failed items before delivery.`,
  },
];
