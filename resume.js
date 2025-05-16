const fs = require('fs');
const mainFile = 'main.tex';

//Parses a line's inclusion in each resume
function parseResTag(line) {
  const match = line.match(/^%Res:\s*\{([^}]*)\}(?:\s*-\s*\{([^}]*)\})?\s*\[\s*$/);
  if (!match) return null;

  const include = match[1].split(',').map(s => s.trim()).filter(Boolean);
  const exclude = match[2] ? match[2].split(',').map(s => s.trim()).filter(Boolean) : [];

  return { include, exclude };
}

//Parses a line's sorted order for each resume
function parseSortTag(line) {
  const match = line.match(/^%Sort:\s*\{([^}]*)\}\s*\[\s*$/);
  if (!match) return null;

  const raw = match[1].split(',');
  let out = {};
  for (let kv of raw) {
    let [k, v] = kv.split(':').map(s => s.trim());
    if (k && v) out[k] = parseInt(v);
  }
  return out;
}

//Creates a block object with resumes and sortMap
function createBlock(resumes = ['*'], sortMap = {}) {
  return {
    resumes: { include: resumes, exclude: [] },
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

    //Checks for block end
    if (line === '%]') {
      return { block, nextIndex: i + 1 };
    }

    //Checks for block start
    if (line.startsWith('%Res:') || line.startsWith('%Sort:')) {
      let resumes = { include: ['*'], exclude: [] };
      let sortMap = {};

      if (line.startsWith('%Res:')) {
        const parsedResumes = parseResTag(line);
        if (parsedResumes) resumes = parsedResumes;
      } 
      else if (line.startsWith('%Sort:')) {
        const parsedSortMap = parseSortTag(line);
        if (parsedSortMap) sortMap = parsedSortMap;
      }

      //Add lines to the block until it ends
      const { block: nestedBlock, nextIndex } = parseLines(lines, i + 1);

      //Add tags
      nestedBlock.resumes = resumes;
      nestedBlock.sortMap = sortMap;

      block.lines.push(nestedBlock);
      i = nextIndex;
      continue;
    }

    block.lines.push(rawLine);
    i++;
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
  const include = block.resumes.include || ['*'];
  const exclude = block.resumes.exclude || [];

  const included = include.includes('*') || include.includes(targetResume);
  const excluded = exclude.includes(targetResume);

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

const testTag = parseResTag("%Res:{*}-{MechE}[");
console.log('Test parsed ResTag:', testTag);

if (!fs.existsSync('./Resumes')) fs.mkdirSync('./Resumes');

for (const resume of resumes) {
  const outputLines = renderBlock(tree, resume);
  const outputText = outputLines.join('\n');
  fs.writeFileSync(`./Resumes/${resume.replace(/\s+/g, '_')}.tex`, outputText, 'utf-8');
  console.log(`Written resume file for: ${resume}`);
}