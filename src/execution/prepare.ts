import { parse } from "acorn";

// Parse JavaScript instead of stripping syntax with regexes (which corrupted
// object properties, strings, comments, and even parts of the sample scripts).
export function prepareUserCode(code: string): string {
  const tree = parse(code, {
    ecmaVersion: "latest", sourceType: "module",
    allowAwaitOutsideFunction: true, allowReturnOutsideFunction: true,
  });
  let hasEntry = false;
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const node of tree.body) {
    if (node.type === "ImportDeclaration" || node.type === "ExportAllDeclaration" ||
        (node.type === "ExportNamedDeclaration" && node.source)) {
      throw new Error("Imports are not supported. Include dependencies in the script itself.");
    }
    if (node.type === "ExportDefaultDeclaration") {
      hasEntry = true;
      const declaration = node.declaration;
      if ((declaration.type === "FunctionDeclaration" || declaration.type === "ClassDeclaration") && declaration.id) {
        edits.push({ start: node.start, end: declaration.start, text: "" });
        edits.push({ start: node.end, end: node.end, text: `\nconst __miniscriptsDefault = ${declaration.id.name};` });
      } else {
        edits.push({ start: node.start, end: declaration.start, text: "const __miniscriptsDefault = " });
        edits.push({ start: node.end, end: node.end, text: ";" });
      }
    } else if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) edits.push({ start: node.start, end: node.declaration.start, text: "" });
      else {
        const defaultExport = node.specifiers.find(s => s.exported.type === "Identifier" && s.exported.name === "default");
        edits.push({ start: node.start, end: node.end, text: defaultExport ? `const __miniscriptsDefault = ${(defaultExport.local.type === "Identifier" ? defaultExport.local.name : defaultExport.local.value)};` : "" });
        if (defaultExport) hasEntry = true;
      }
    }
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (declaration?.type === "FunctionDeclaration" && /^(run|app)$/.test(declaration.id?.name || "")) hasEntry = true;
    if (declaration?.type === "VariableDeclaration" && declaration.declarations.some(d => d.id.type === "Identifier" && /^(run|app)$/.test(d.id.name))) hasEntry = true;
  }
  let prepared = code;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    prepared = prepared.slice(0, edit.start) + edit.text + prepared.slice(edit.end);
  }
  if (!hasEntry) return prepared;
  return `${prepared}\n;const __entry = typeof __miniscriptsDefault === 'function' ? __miniscriptsDefault : typeof run === 'function' ? run : typeof app === 'function' ? app : null;
if (!__entry) throw new Error('Script must provide a callable default export, run, or app.');
return await __entry(ctx);`;
}
