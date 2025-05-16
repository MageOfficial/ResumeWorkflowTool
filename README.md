# Resume Filter and Sorter for LaTeX Documents

This Node.js script processes a single LaTeX resume source file (`main.tex`) and generates multiple resume versions based on inline filtering and sorting annotations. 
This is to help automate resume customization for different audiences. Ex: You want to apply to two different types of jobs that have similar skills in some areas but some of the skills are irrelevant to each other.

## Features

- **Inline Block Filtering**: Use `%Res:{include} - {exclude}[` syntax to define which resumes should include or exclude specific content blocks.
- **Custom Sorting**: Apply `%Sort:{ResumeA: 1, ResumeB: 2}[` to control the order of sections per resume.
- **Nested Block Support**: Blocks can be nested to represent hierarchical LaTeX structures.
- **Stable Sorting**: Consecutive blocks are sorted only when necessary, preserving original order where priority values are equal or unspecified.
- **Multiple Output Files**: Generates a `.tex` file for each specified resume, with filtered and sorted content and filtering and sorting comments removed while other comments remain.

## Getting Started

### Prerequisites

- Node.js (version 14 or later)

### Setup
1. Clone or download the project.
2. Ensure your LaTeX file is named `main.tex` and placed in the root directory.
3. Define your resume variants in the header of the LaTeX file like so:

```latex
% RESUMES START
% RESUMES: Resume1, Resume2, Resume3
% RESUMES END
```

4. Annotate blocks within the document using:

```latex
%Res:{Resume1, Resume2} - {Resume3}[
... content ...
%]

%Sort:{Resume1: 1, Resume2: 2}[
... content ...
%]

%Res:{Resume1, Resume2} - {Resume3} Sort:{Resume1: 1, Resume2: 2}[
... content ...
%]
```

5. Run the script:

```bash
node resume.js
```

This will generate one `.tex` file per resume in the `./Resumes` directory.

## File Structure

```
main.tex         # Your annotated LaTeX resume source file
resume.js         # Main processing script
Resumes/         # Output directory for generated .tex files
```

## Syntax Overview

### Block Start

- `%Res:{ResumeA, ResumeB} - {ResumeX}[`  
  Includes this block only in ResumeA and ResumeB, and excludes it from ResumeX.
- `%Sort:{ResumeA: 1, ResumeB: 2}[`  
  Sort priority for this block across different resumes. Lower numbers are higher priority.

### Block End

- `%]`  
  Marks the end of the current block.

### Example

A generic example file is provided as mainexample.tex

## License

MIT License. See `LICENSE` file for details.
