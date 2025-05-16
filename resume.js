const fs = require('fs')

const mainFile = 'main.tex'
const outputDir = './Resumes/'

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

const content = fs.readFileSync(mainFile, 'utf-8').split('\n')

// Parse resumes list
let resumes = []
let inResumeBlock = false
for (let line of content) {
  if (line.trim().startsWith('% RESUMES START')) inResumeBlock = true
  if (inResumeBlock && line.includes('RESUMES:')) {
    resumes = line
      .split(':')[1]
      .split(',')
      .map(r => r.trim())
  }
  if (line.trim().startsWith('% RESUMES END')) inResumeBlock = false
}

if (!resumes.length) throw 'No RESUMES: line found'

let outputs = {}
for (let r of resumes) outputs[r] = []

function checkTag(tag, resume) {
  if (!tag) return true
  const [includeRaw, excludeRaw] = tag.split('-')
  const includes = includeRaw ? includeRaw.slice(1, -1).split(',').map(s => s.trim()) : ['*']
  const excludes = excludeRaw ? excludeRaw.slice(1, -1).split(',').map(s => s.trim()) : []
  const includeAll = includes.length === 1 && includes[0] === '*'
  return (includeAll || includes.includes(resume)) && !excludes.includes(resume)
}

function parseSortLine(str) {
  const out = {}
  str.split(',').forEach(pair => {
    const [k, v] = pair.split(':').map(s => s.trim())
    out[k] = Number(v)
  })
  return out
}

let blocks = []
let i = 0
while (i < content.length) {
  const line = content[i].trim()

  if (line.startsWith('%Res:') || line.startsWith('%Sort:')) {
    let tag = null
    let sort = null

    if (line.startsWith('%Res:')) {
      const tagMatch = line.match(/^%Res:\s*({[^}]+}(?:-\{[^}]+\})?)/)
      if (tagMatch) tag = tagMatch[1]
      const sortMatch = line.match(/%Sort:\s*{([^}]+)}/)
      if (sortMatch) sort = parseSortLine(sortMatch[1])
    } else {
      const sortMatch = line.match(/^%Sort:\s*{([^}]+)}/)
      if (sortMatch) sort = parseSortLine(sortMatch[1])
      tag = '{*}'
    }

    i++
    let blockLines = []
    while (
      i < content.length &&
      content[i].trim() !== '' &&
      !content[i].trim().startsWith('%Res:') &&
      !content[i].trim().startsWith('%Sort:') &&
      !content[i].trim().toLowerCase().includes("end")
    ) {
      blockLines.push(content[i])
      i++
    }
    i--

    blocks.push({ tag, sort, lines: blockLines })
  } 
  else {
    // flush accumulated blocks before processing normal line
    if (blocks.length) {
      for (let r of resumes) {
        let included = blocks.filter(b => checkTag(b.tag, r))
        included.sort((a, b) => {
          const ap = a.sort && a.sort[r] != null ? a.sort[r] : 1e9
          const bp = b.sort && b.sort[r] != null ? b.sort[r] : 1e9
          return ap - bp
        })
        for (let b of included) outputs[r].push(...b.lines)
      }
      blocks = []
    }
    for (let r of resumes) outputs[r].push(content[i])
  }
  i++
}

// For each resume, filter blocks by tag, sort by priority, then push lines to outputs
for (let r of resumes) {
  // Filter blocks included in this resume
  let filtered = blocks.filter(b => checkTag(b.tag, r))

  // Sort by priority for this resume or default to big number to keep stable order
  filtered.sort((a, b) => {
    const aPriority = a.sort && a.sort[r] != null ? a.sort[r] : 1e9
    const bPriority = b.sort && b.sort[r] != null ? b.sort[r] : 1e9
    return aPriority - bPriority
  })

  // Insert sorted blocks into output
  for (let b of filtered) {
    outputs[r].push(...b.lines)
  }
}

for (let r of resumes) {
  const name = r.replace(/\s+/g, '_') + '.tex'
  fs.writeFileSync(outputDir + name, outputs[r].join('\n'))
}
