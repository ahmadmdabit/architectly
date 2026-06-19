Issues:

- Clicking `Start Over` button, asks the user confirmation. However, clicking the website logo, navigate immediatly without confirmaing. NOTE: This is may not an issue but intential by design. To figure if so or not, do the required analysis.

- interview route
  - If the user clicked `Skip (AI will assume)`, after the AI complete the generation, do not immediatly go to the next question. Otherwise let the user review the assumption.
  - The bottom `Answered so far (*)` block, should be expanded by default
  - The Questions sidebar at the left, float over the Answers block, when scrolling down, making the answers not readable/visible.
  - Critical: Clicking `Back` button, remove the answer and make the question not answered. Fix and add new `Next` button to navigate back/forward the questions. Rename `Back` button to `Previous`.
  - Critical: Clicking any question of the Questions sidebar, removes all the next questions and their answers.
  - 

- result route
  - PDF contains wrong text and characters likey its an encoding issue
  - DOCX display the tables as a markdown format not DOCX format
  - Print body text color should be darker or black
  - The title of the document, the header, the headings and the footer should be in-line editable
  - The in-line edit work perfect. However, cancel button required and ESC button support
  - The refine button should be for AI based refinement only. The popup's original textarea should be readonly. The prompt area is only the inputable. `Save my edits` button should not be. The popup should not dismiss when clicking out of it.

- library route
  - The document row should has dropdown actions menu, contains Rename, Export MD, Delete, all the export options

- Arabic
  - In the header, the logo, title, and sologo, should be horizontally mirrored
  - Choosing better font
