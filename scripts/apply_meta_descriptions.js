const fs = require('fs');
const path = require('path');

const ROOT_DIR = 'C:\\Antigravity\\mcjp-io';
const POSTS_DIR = path.join(ROOT_DIR, 'content', 'posts');

function parseMarkdown(fileContent) {
    const match = fileContent.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { yamlLines: [], data: {}, content: fileContent };
    const yaml = match[1];
    const content = match[2];
    const data = {};
    const yamlLines = yaml.split('\n');
    yamlLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            let val = parts.slice(1).join(':').trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            data[key] = val;
        }
    });
    return { yamlLines, data, content };
}

function cleanExcerpt(content) {
    // Split into paragraphs and find the first non-empty paragraph
    const paragraphs = content.split(/\r?\n\r?\n/);
    let firstParagraph = '';
    for (const p of paragraphs) {
        const trimmed = p.trim();
        // Skip headings, images, blockquotes, lists
        if (
            trimmed &&
            !trimmed.startsWith('#') &&
            !trimmed.startsWith('>') &&
            !trimmed.startsWith('-') &&
            !trimmed.startsWith('*') &&
            !trimmed.startsWith('`') &&
            !trimmed.includes('![')
        ) {
            firstParagraph = trimmed;
            break;
        }
    }

    if (!firstParagraph) return '';

    // Strip markdown formatting: bold, italic, links
    let clean = firstParagraph
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/`/g, '')
        .replace(/"/g, "'")
        .replace(/\r?\n/g, ' ')
        .trim();

    // Limit to 140-160 characters
    if (clean.length > 155) {
        // Cut at space
        let sub = clean.substring(0, 152);
        const lastSpace = sub.lastIndexOf(' ');
        if (lastSpace > 120) {
            sub = sub.substring(0, lastSpace);
        }
        clean = sub + '...';
    }

    return clean;
}

function run() {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
    let count = 0;

    for (const file of files) {
        const fullPath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const parsed = parseMarkdown(fileContent);

        const currentDesc = parsed.data.description || '';
        const isDefault = currentDesc.toLowerCase().includes('automated guide map') || currentDesc === '';

        if (isDefault) {
            const desc = cleanExcerpt(parsed.content);
            if (desc) {
                // Reconstruct file with new description
                let hasDesc = false;
                const newYamlLines = parsed.yamlLines.map(line => {
                    const parts = line.split(':');
                    if (parts[0].trim() === 'description') {
                        hasDesc = true;
                        return `description: "${desc}"`;
                    }
                    return line;
                });

                if (!hasDesc) {
                    // Find where to insert description
                    newYamlLines.push(`description: "${desc}"`);
                }

                const newYaml = newYamlLines.join('\n');
                const newFullContent = `---\n${newYaml}\n---\n${parsed.content}`;
                fs.writeFileSync(fullPath, newFullContent, 'utf8');
                console.log(`📝 Generated description for ${file}: "${desc}"`);
                count++;
            }
        }
    }
    console.log(`🎉 Batch description generation complete. Updated ${count} files.`);
}

run();
