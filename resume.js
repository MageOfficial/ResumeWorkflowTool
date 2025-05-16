const fs = require('fs');
const mainFile = 'main.tex';

//Parses a line's tags in each resume for sorting and filtering
// %Res: {include} - {exclude} Sort: {key:value, ...}
function parseTagLine(line) {
  const match = line.match(
    /^%(?:(Res):\s*\{([^}]*)\}(?:\s*-\s*\{([^}]*)\})?)?\s*(?:(Sort):\s*\{([^}]*)\})?\s*\[\s*$/
  );
  if (!match) return null;

  let resumes = { include: new Set(['*']), exclude: new Set() };
  let sortMap = {};

  if (match[1] === 'Res') {
    const include = match[2]?.split(',').map(s => s.trim()).filter(Boolean) || ['*'];
    const exclude = match[3]?.split(',').map(s => s.trim()).filter(Boolean) || [];
    resumes = {
      include: new Set(include),
      exclude: new Set(exclude),
    };
  }

  if (match[4] === 'Sort') {
    const rawSort = match[5]?.split(',') || [];
    for (const kv of rawSort) {
      const [k, v] = kv.split(':').map(s => s.trim());
      if (k && v !== undefined) sortMap[k] = parseInt(v);
    }
  }

  return { resumes, sortMap };
}

//Creates a block object with resumes and sortMap
function createBlock(include = new Set(['*']), exclude = new Set(), sortMap = {}) {
  return {
    resumes: include,
    exclude: exclude,
    sortMap,
    lines: [],
  };
}


//Parses the lines of the file into a block tree structure
function parseLines(lines, startIndex = 0) {
  const block = createBlock();
  let i = startIndex;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line === '%]') {
      return { block, nextIndex: i + 1 };
    }
    else if (line.startsWith('%Res:') || line.startsWith('%Sort:')) {
      const { resumes, sortMap } = parseTagLine(line);
      const { block: nestedBlock, nextIndex } = parseLines(lines, i + 1);

      nestedBlock.resumes = resumes.include;
      nestedBlock.exclude = resumes.exclude;
      nestedBlock.sortMap = sortMap;

      block.lines.push(nestedBlock);
      i = nextIndex;
    }
    else{
      block.lines.push(rawLine);
      i++;
    }
  }

  return { block, nextIndex: i };
}

//Extracts resumes from the header of the file
function extractResumesFromHeader(lines) {
  let inBlock = false;
  let header = [];
  for (let line of lines) {
    if (line.includes('% RESUMES START')) inBlock = true;
    if (line.includes('% RESUMES END')) break;
    if (inBlock) header.push(line);
  }
  const line = header.find(l => l.includes('RESUMES:'));
  if (!line) throw new Error('No RESUMES: line found');
  return line.split(':')[1].split(',').map(x => x.trim());
}

//Checks if a resume is included in the block
function isResumeIncluded(block, targetResume) {
  const include = block.resumes || new Set(['*']);
  const exclude = block.exclude || new Set();

  const included = include.has('*') || include.has(targetResume);
  const excluded = exclude.has(targetResume);

  return included && !excluded;
}


//Forms new resume
function renderBlock(block, targetResume) {
  let outputLines = [];

  if (!isResumeIncluded(block, targetResume)) {
    return [];
  }

  let buffer = [];

  function outputBuffer() {
    if (buffer.length === 0) return;
      //Sort the buffer based on the sortMap
    buffer.sort((a, b) => {
      const aVal = a.sortMap?.[targetResume] ?? Infinity;
      const bVal = b.sortMap?.[targetResume] ?? Infinity;
      return aVal - bVal;
    });

    //Recurse on nested blocks
    for (const nested of buffer) {
      outputLines.push(...renderBlock(nested, targetResume));
    }

    buffer = [];
  }

  for (const item of block.lines) {
    if (typeof item === 'string') {
      //For a continuous series of blocks we sort and output them
      outputBuffer();
      //Push strings directly to output
      outputLines.push(item);
    } else if (typeof item === 'object' && item.lines) {
      //If it's a block, we push it to the buffer until we are ready to sort it
      buffer.push(item);
    }
  }

  //Finalize if we have any remaining blocks
  outputBuffer();

  return outputLines;
}


const content = fs.readFileSync(mainFile, 'utf-8').split(/\r?\n/);
const resumes = extractResumesFromHeader(content);
const { block: tree } = parseLines(content);

if (!fs.existsSync('./Resumes')) fs.mkdirSync('./Resumes');

for (const resume of resumes) {
  const outputLines = renderBlock(tree, resume);
  const outputText = outputLines.join('\n');
  fs.writeFileSync(`./Resumes/${resume.replace(/\s+/g, '_')}.tex`, outputText, 'utf-8');
  console.log(`Written resume file for: ${resume}`);
}