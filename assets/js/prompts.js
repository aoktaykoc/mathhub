'use strict';
/* Built-in prompt templates for the AI content studio.
   {{placeholders}} are filled from the chosen lesson — see AI_PLACEHOLDERS in core.js.
   Raise ersion when a built-in prompt changes so browsers that already stored it get the new text. */

const BUILTIN_PROMPTS = [
  {
    id: 'tpl-isl-package',
    version: 2,
    name: 'ISL Qatar — Complete Lesson Package (master prompt, Beamer)',
    text: `ISL Qatar Mathematics — Complete {{level}} Lesson Package Master Prompt (LaTeX Beamer edition)

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
Use the same notation, method and vocabulary in all documents. Use the same question identifiers everywhere (for example S1–S6 starter, N1 notice/why, W1–W3 WE DO, A/B/C/D YOU DO sections, E1–E3 Spot the Mistake, X1–X4 exit ticket, P1… preparation, R1/H1…/ST1… after-lesson practice). Homework should test taught material; any optional extension that introduces a new method must include enough support.

For each lesson follow Starter → Prerequisite Check → I DO → Mini-Whiteboard Check 1 → WE DO → Mini-Whiteboard Check 2 → YOU DO → Check for Understanding → Exit Ticket. Use retrieval, worked examples, gradual release, visual organisation and frequent checks. Questions begin very accessibly and progress gradually to {{level}} standard. Provide a minute-by-minute table with columns Time | Stage | Teacher action | Student action | Resource/page/slide | Evidence/decision. Stage durations must add up exactly to the lesson length, including transition and feedback time.

1. Before-Lesson Preparation — student document
Create a separate Lesson_XX_Preparation.tex and .pdf for every lesson. Students complete this independently before class in about 10–15 minutes. Prepare prerequisite knowledge without trying to teach the entire new topic.
Include: purpose and estimated time; instructions for getting unstuck; 2–4 retrieval questions; a short Remember box with essential notation or facts; one fully worked prerequisite example explaining each step; a helpful representation or comparison where appropriate; 2–4 short Try It items with working space; one prediction or notice/wonder question bridging to the new topic; and a self-check ("I can do this / I need help with this / My question for class").
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
Make difficulty change through mathematical thinking, not only larger numbers. Add one retrieval question from a previous lesson when appropriate, a three-item mixed self-test, and a reflection ("I can do independently / I need to practise / My question"). State which questions to attempt if time is limited. Never include answers in student pages. In the Answer Key, provide complete worked solutions to every level and the self-test; these can be released to students later.

4. Teacher Presentation — LaTeX Beamer
Create Lesson_XX_Teacher_Slides_Beamer.tex for every lesson and compile it to two PDFs: Lesson_XX_Teacher_Slides_Beamer.pdf (slides only, for projecting) and Lesson_XX_Teacher_Slides_Beamer_Notes.pdf (each slide followed by a notes page with a slide thumbnail and the presenter notes). A slide outline alone does not meet this requirement. Use large, legible text, high contrast, sparse wording, correct mathematical notation and clear diagrams; do not convey meaning by colour alone. Use no fabricated school logo. Reveal worked steps and answers only after students have thought or responded: never show an answer on the same slide as its question.

Slide sequence: (1) title/objective/success criteria; (2) starter and a separate answer/reveal slide; (3) link to preparation and quick prerequisite response; (4) vocabulary/concept visual; (5) at least two stepped I DO examples, shown as step tables (step | reason), one idea per slide, splitting long examples across two slides, followed by a method-summary slide (numbered process diagram and sentence stem); (6) Mini-Whiteboard Round 1 and a separate answer slide; (7) 2–4 WE DO examples with fading support (full blanks → partial template → minimal prompt), each followed by a separate solution slide; (8) Mini-Whiteboard Round 2 and a separate answer slide; (9) YOU DO instructions as Must / Should / Could / Extension cards with worksheet references, timing and calculator rule; (10) Spot the Mistake and a separate correction slide; (11) exit ticket; (12) recap and next step (homework, required items, short-on-time route). Adjust slide count to the lesson duration; a round may span multiple slides.
For both mini-whiteboard rounds, include about five questions: very easy, easy, similar, variation, deliberate misconception. Slides guide teaching and show selected examples, rather than copying the entire worksheet. Slide numbers, worksheet page numbers and question IDs must match the Teacher Pack exactly.

Presenter notes: every substantive slide needs \\note{...} with SAY, ASK, EXPECT, WATCH FOR, IF STUDENTS STRUGGLE (where relevant), the relevant worksheet page/question and the timing (e.g. 0:12–0:15). Mini-whiteboard notes include the routine, the answer to each question, the misconception each targets, the decision threshold (about 80% on the harder questions), a 2–3 minute reteach and a re-check question.

Design:
- \\documentclass[aspectratio=169,11pt,xcolor=table]{beamer}; no navigation symbols; a custom plain theme.
- Palette: navy 1F3A5F (main), teal 0F766E, gold B45309 (accent/warnings), light F3F6F9 (cards), ink 1A1A1A, grey 5B6770. White content slides; navy title and recap slides.
- Motif: a small coloured rounded "stage chip" above each title (STARTER, PREP, CONCEPT, I DO, WE DO, MINI-WHITEBOARD, YOU DO, CHECK, EXIT TICKET, ANSWERS, RECAP).
- Question cards: light rounded boxes (tcolorbox) with a navy numbered circle. Step tables: alternating row shading, bold navy step names.
- Diagrams in TikZ (for example area squares, 3D cubes, number lines with the estimate marked, process arrows). Every slide has a visual element.
- Footer: "Lesson XX · Topic" and slide number / total.

Technical requirements:
- One self-contained .tex file compiled with pdflatex (packages: amsmath, amssymb, tabularx, array, booktabs, tikz, tcolorbox[most]).
- Notes switch at the top: \\newif\\ifnotes \\notesfalse and \\ifnotes\\setbeameroption{show notes}\\fi; compile once with \\notesfalse and once with \\notestrue.
- Known pitfalls to avoid:
  • tabularx inside a custom environment must use \\tabularx … \\endtabularx, not \\begin{tabularx}.
  • In coloured p{} columns write >{\\bfseries\\leavevmode\\color{navy}}, otherwise cells misalign.
  • Never define \\newcommand with #1 inside a frame; define all macros in the preamble.
  • Do not load fonts that are not installed (check with kpsewhich).
- Compile twice, fix every error, and remove every "Overfull \\vbox" (content running off the slide) by reducing font size, splitting slides or tightening spacing.
If Beamer compilation is impossible, supply the complete .tex source and slide-by-slide content with presenter notes in an editable document, state exactly which PDF is missing, and never claim it was created.

Teacher Pack
Create Teacher_Pack.tex and .pdf with a clearly marked section for each lesson: objectives, success criteria, prerequisite analysis, vocabulary, resources, exact timing, preparation follow-up, slide/worksheet cross-references (using the Beamer slide numbers), board plan, teaching script, differentiation, misconceptions and next-lesson decisions.
For each teaching point provide SAY (simple and precise), WRITE (exact board text), ASK, EXPECT, WATCH FOR and IF STUDENTS STRUGGLE. The board plan uses concise sections: title, objective, vocabulary, Remember, numbered method, worked examples, common mistake and Your Turn. Model at least two examples for each new concept, making the reason for each step visible and checking results.
For both mini-whiteboard rounds provide question, answer, misconception/check and a response if many miss it. Routine: "Boards down → work independently → show in 3, 2, 1 → do not erase → scan all boards." Give a decision threshold (for example, approximately 80% correct), a 2–5 minute reteach if below threshold and another short check. For 2–4 WE DO examples provide teacher prompts, expected student responses and full solutions with decreasing support. Include at least four topic-specific misconceptions in a table: Misconception | Example | Diagnosis | Teacher response.
Interpret the exit ticket by the essential objective. Give actions for most students secure, about half struggling and most struggling, identifying what prerequisite or concept to revisit. A colleague should be able to teach directly from this pack.
Also create Mini_Whiteboard_Reference.tex and .pdf: a concise teacher reference with both rounds in teaching order, answers, purpose and reteach prompts; one page per lesson where possible.

Answer Key
Create Answer_Key.tex and .pdf. Separate by lesson and by Preparation, Starter, Mini-whiteboards, I DO/WE DO, Class Worksheet, Error Analysis, Exit Ticket, After-Lesson Practice, Self-Test. Show intermediate steps and acceptable alternative methods. Check arithmetic, units, domain restrictions, rounding and notation. Question identifiers and answers must correspond exactly to the student documents and the slides.

Typesetting and delivery
Provide complete, compilable A4 LaTeX for each text document and 16:9 Beamer LaTeX for the slides. Useful standard packages: geometry, amsmath, amssymb, enumitem, tcolorbox, tabularx, multicol, fancyhdr, tikz. Use proper mathematical notation, readable spacing, working space and logical page breaks. Use Lesson_01, Lesson_02, etc. consistently in filenames and references. Do not leave placeholders in final teaching materials.
Compute every answer, estimate and rounding in code before writing it; where an estimate is rounded, confirm the rounding is correct.
Compile every .tex (including both Beamer versions), fix errors, render every page to images and visually inspect for clipping, content running off slides, missing symbols, dense pages and accidental student-facing answers. Supply all generated PDFs and the editable .tex source files (also bundled in one zip); do not provide LaTeX alone when file creation is available. If a tool limitation prevents an output, name precisely what was not produced and give the best complete editable substitute.
Before finishing, verify: exact timing; feasible workload; accessible preparation; conceptual progression in class; meaningful Easy/Medium/Hard practice; correct answers; alignment of slides, worksheet pages and question numbers; answers only on reveal slides or in notes; appropriate mini-whiteboard teaching decisions; adequate working space; no answer leakage; and all files open and render correctly. Revise failed items before delivery.`,
  },
];
