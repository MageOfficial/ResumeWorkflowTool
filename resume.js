const fs = require('fs')

const mainFile = 'main.tex'
const outputDir = './Resumes/'

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir)

const content = fs.readFileSync(mainFile, 'utf-8').split('\n')

// Parse resume list
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

let nextTag = null

function checkTag(tag, resume) {
  const [includeRaw, excludeRaw] = tag.split('-')
  const includes = includeRaw ? includeRaw.slice(1, -1).split(',').map(s => s.trim()) : ['*']
  const excludes = excludeRaw ? excludeRaw.slice(1, -1).split(',').map(s => s.trim()) : []
  const includeAll = includes.length === 1 && includes[0] === '*'
  return (includeAll || includes.includes(resume)) && !excludes.includes(resume)
}

for (let i = 0; i < content.length; i++) {
  const line = content[i]
  const trimmed = line.trim()

  if (trimmed.startsWith('%Res:')) {
    const tagMatch = trimmed.match(/^%Res:\s*({[^}]+}(?:-\{[^}]+\})?)/)
    if (!tagMatch) continue
    nextTag = tagMatch[1].trim()

    let block = []
    i++
    while (i < content.length) {
      const l = content[i]
      const t = l.trim()
      if (t === '' || t.startsWith('%Res:') || t.startsWith('%')) break
      block.push(l)
      i++
    }
    i--

    for (let r of resumes) {
      if (checkTag(nextTag, r)) outputs[r].push(...block)
    }
    nextTag = null
  } else {
    for (let r of resumes) outputs[r].push(line)
  }
}

for (let r of resumes) {
  const name = r.replace(/\s+/g, '_') + '.tex'
  fs.writeFileSync(outputDir + name, outputs[r].join('\n'))
}
