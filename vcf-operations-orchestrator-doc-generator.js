import fs from "fs";
import path from "path";

if (process.argv.length < 4) {
    console.error(`
❌ Incorrect usage.

✅ Correct format:
    node ${path.basename(process.argv[1])} <source_directory> <docs_output_directory>

Example:
    node ${path.basename(process.argv[1])} .\\src\\main\\resources .\\docs

`);
    process.exit(1);
}

const classRegex = /\/\*\*(\s*\n(?:[^\*]|(?:\*(?!\/)))*)\*\/\s*function\s+(\w+)\s*/;
const classTagRegex = /@class/;

function getModuleName(inputFile) {
    const filePathRegex = /src[\/\\]main[\/\\]resources[\/\\](.+)[\/\\][^\/\\]+\.js$/;
    let moduleName = "unknown";
    const moduleMatch = inputFile.match(filePathRegex);
    if (moduleMatch) {
        moduleName = moduleMatch[1].replace(/\\/g, "/").replace(/\//g, ".");
        const fileBaseName = path.basename(inputFile, ".js");
        moduleName = moduleName.replace(new RegExp(`\\.?${fileBaseName}$`), "");
    }

    return moduleName;
}

function generateMarkdown(inputFile, fallbackName = null) {
    const content = fs.readFileSync(inputFile, "utf8");
    const sanitizedContent = content.replace(/\r\n/g, "\n");
    const prototypeMethodRegex = /\/\*\*(\s*\n(?:[^\*]|(?:\*(?!\/)))*)\*\/\s*.*\.prototype\.(\w+)/gm;
    const inlineMethodRegex = /\/\*\*(\s*\n(?:[^\*]|(?:\*(?!\/)))*)\*\/\s*(?:this\.|var\s)(\w+)\s*=\s*function/gm;
    const anonFunctionRegex = /\/\*\*((?:.|\n)*?)\*\/\s*\(function\s*\(([^)]*)\)/gm;
    const inheritanceRegex = /(?:\w+)\.prototype\s*=\s*Object\.create\(\s*(\w+)\.prototype\s*\)/;

    let moduleName = getModuleName(inputFile);

    const classMethods = [];
    const standardActions = [];
    let markdown = "";
    let match;
    const classMatch = classRegex.exec(sanitizedContent);
    const isClassBased = classTagRegex.test(sanitizedContent);

    if (classMatch && isClassBased) {
        const [, jsdoc, name] = classMatch;
        const cls = processJsDocTags(name, jsdoc);

        markdown += `# Class \`${cls.name}\`\n\n`;
        markdown += `Module: \`${moduleName}\`\n\n`;

        const inheritanceMatch = inheritanceRegex.exec(sanitizedContent);
        if (inheritanceMatch) {
            const [, baseClass] = inheritanceMatch;
            markdown += `Extends \`${baseClass}\`\n\n`;
        }
        
        markdown += `${cls.desc.trim()}\n\n`;

        if (cls.params.length) {
            markdown += `**Parameters:**\n\n`;
            markdown += `| Name | Type | Description |\n`;
            markdown += `|------|------|-------------|\n`;
            cls.params.forEach(p => {
                const paramName = p.name.replace(/^\[|\]$/g, "");
                markdown += `| ${paramName} | \`${p.type}\` | ${p.desc} |\n`;
            });
            markdown += `\n`;
        }

        markdown += `## Methods\n\n`;

        while ((match = prototypeMethodRegex.exec(sanitizedContent)) !== null) {
            const [, jsdoc, name] = match;
            classMethods.push(processJsDocTags(name, jsdoc));
        }
        while ((match = inlineMethodRegex.exec(sanitizedContent)) !== null) {
            const [, jsdoc, name] = match;
            classMethods.push(processJsDocTags(name, jsdoc));
        }
    } else {
        while ((match = anonFunctionRegex.exec(sanitizedContent)) !== null) {
            const [, jsdoc] = match;
            const fileName = fallbackName || path.basename(inputFile, ".js");
            standardActions.push(processJsDocTags(fileName, jsdoc));
        }
    }

    const functionsToProcess = isClassBased ? classMethods : standardActions;

    functionsToProcess.forEach(fn => {
        let fnName = fn.name;
        markdown += `### `;
        if (fn.isPrivate) {
            markdown += `\*private\* `;
        } else if (fn.isPublic) {
            markdown += `\*public\* `;
        }
        markdown += `\`${fnName}()\`\n\n`;
        markdown += `${fn.desc.trim()}\n\n`;

        if (fn.params.length) {
            markdown += `**Parameters:**\n\n`;
            markdown += `| Name | Type | Description |\n`;
            markdown += `|------|------|-------------|\n`;
            fn.params.forEach(p => {
                const paramName = p.name.replace(/^\[|\]$/g, "");
                markdown += `| ${paramName} | \`${p.type}\` | ${p.desc} |\n`;
            });
            markdown += "\n";
        }

        if (fn.example) {
            markdown += `**Example:**\n\n`;
            markdown += "```javascript\n" + fn.example + "\n```\n\n";
        }

        if (fn.returns) {
            markdown += `**Returns:** \`${fn.returns.type}\` — ${fn.returns.desc}\n\n`;
        }

        markdown += `---\n\n`;
    });

    return markdown.trim();
}

function processJsDocTags(name, jsdoc) {
    const paramTagRegex = /^@param\s+{([^}]+)}\s+(\[?\w+\]?)(?:\s*-\s*(.+))?/;
    const returnsTagRegex = /^@returns\s+{([^}]+)}\s*(?:-\s*)?(.+)/;
    const exampleTagRegex = /^@example\s*(.*)/;
    const descTagRegex = /^@(?:desc|description)\s+(.+)/;

    const jsdocObject = {
        name,
        desc: "",
        params: [],
        returns: null,
        isPrivate: false,
        isPublic: false,
        example: null
    };

    let capturingDesc = true;
    jsdoc.split("\n").forEach((line, idx, lines) => {
        const clean = line.replace(/^\s*\*\s?/, "").trim();

        if (clean.startsWith("@param")) {
            capturingDesc = false;
            const match = paramTagRegex.exec(clean);
            if (match) {
                const [, type, name, desc] = match;
                jsdocObject.params.push({ type, name, desc: desc || "" });
            }
        } else if (clean.startsWith("@returns")) {
            capturingDesc = false;
            const match = returnsTagRegex.exec(clean);
            if (match) {
                const [, type, desc] = match;
                jsdocObject.returns = { type, desc: desc || "" };
            }
        } else if (clean.startsWith("@example")) {
            capturingDesc = false;
            const match = exampleTagRegex.exec(clean);
            if (match) {
                const exampleLines = [match[1]];
                for (let i = idx + 1; i < lines.length; i++) {
                    const nextLine = lines[i].replace(/^\s*\*\s?/, "");
                    if (nextLine.startsWith("@")) break;
                    exampleLines.push(nextLine);
                }
                jsdocObject.example = exampleLines.join("\n");
            }
        } else if (clean.startsWith("@private")) {
            capturingDesc = false;
            jsdocObject.isPrivate = true;
        } else if (clean.startsWith("@public")) {
            capturingDesc = false;
            jsdocObject.isPublic = true;
        } else if (clean.startsWith("@desc")) {
            capturingDesc = false;
            const match = clean.match(descTagRegex);
            if (match) {
                jsdocObject.desc = match[1].trim();
            }
        } else if (clean.startsWith("@")) {
            capturingDesc = false; // Ignore unknown tags without breaking
        } else if (capturingDesc && clean) {
            jsdocObject.desc += clean + " ";
        }
    });

    return jsdocObject;
}

function getJsFiles(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== path.basename(docsDir)) {
            getJsFiles(fullPath, fileList);
        } else if (entry.isFile() && fullPath.endsWith(".js")) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

function isClassBased(fileContent) {
    return classTagRegex.test(fileContent) && classRegex.test(fileContent);
}

function createTableOfContents(docsDir) {
    function walk(dir, tocLines = [], prefix = "") {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(docsDir, fullPath).replace(/\\/g, "/");

            if (entry.isDirectory()) {
                tocLines.push(`${prefix}- **${entry.name}**`);
                walk(fullPath, tocLines, prefix + "  ");
            } else if (entry.isFile() && entry.name.endsWith(".md")) {
                const link = relativePath.replace(/\.md$/, "");
                tocLines.push(`${prefix}- [${entry.name.replace(/\.md$/, "")}](./${link})`);
            }
        }

        return tocLines;
    }

    const tocLines = walk(docsDir);
    const tocContent = `# 📚 Table of Contents\n\n` + tocLines.join("\n") + "\n";
    const tocPath = path.join(docsDir, "README.md");

    fs.writeFileSync(tocPath, tocContent, "utf8");
    console.log(`📄 TOC created: ${path.relative(".", tocPath)}`);
}

// === ENTRYPOINT ===
const sourceDir = process.argv[2];
const docsDir = process.argv[3];
// Create the directory if it doesn't exist
fs.mkdirSync(docsDir, { recursive: true });

const allFiles = getJsFiles(sourceDir);
const classWrapperActions = [];
const standardActions = [];

for (const file of allFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (isClassBased(content)) {
        classWrapperActions.push(file);
    } else {
        standardActions.push(file);
    }
}

// Process class-based files
for (const jsFile of classWrapperActions) {
    const relative = path.relative(sourceDir, jsFile);
    const mdPath = path.join(docsDir, relative).replace(/\.js$/, ".md");
    fs.mkdirSync(path.dirname(mdPath), { recursive: true });

    const markdown = generateMarkdown(jsFile);
    fs.writeFileSync(mdPath, markdown, "utf8");
    console.log(`✅ Documented class-based Action: ${relative} → ${path.relative(".", mdPath)}`);
}

// Process standard Action files on a per folder basis
const standardActionGroups = {};
for (const file of standardActions) {
    const folder = path.dirname(file);
    if (!standardActionGroups[folder]) standardActionGroups[folder] = [];
    standardActionGroups[folder].push(file);
}

for (const folder in standardActionGroups) {
    const allMarkdown = standardActionGroups[folder]
        .map((file, index) => {
            let markdown = "";
            if (index === 0) {
                let moduleName = getModuleName(file);
                markdown += `# Module: \`${moduleName}\`\n\n`;
                markdown += `## Actions\n\n`;
            }
            const name = path.basename(file, ".js");
            return markdown += generateMarkdown(file, name);
        })
        .join("\n\n");

    const relative = path.relative(sourceDir, folder);
    const folderName = path.basename(folder);
    const mdPath = path.join(docsDir, relative, `${folderName}.md`);
    fs.mkdirSync(path.dirname(mdPath), { recursive: true });

    fs.writeFileSync(mdPath, allMarkdown, "utf8");
    console.log(`✅ Documented standard Action: ${relative} → ${path.relative(".", mdPath)}`);
}

createTableOfContents(docsDir);
