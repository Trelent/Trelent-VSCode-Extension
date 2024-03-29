import * as path from "path";

const supportedLangs = ["csharp", "java", "javascript", "python", "typescript"];

const getExtensionType = (fileName: string) => {
  let ext = path.extname(fileName);
  if (ext === ".git") {
    let extParts = fileName.split(".");
    ext = extParts[extParts.length - 2];
  }

  return ext;
};

export function isLanguageSupported(languageId: string): boolean {
  return supportedLangs.includes(languageId);
}

export function getLanguageName(languageId: string, fileName?: string): string {
  if (!fileName) {
    return languageId;
  }

  const ext = getExtensionType(fileName);
  switch (ext) {
    case "cs":
      return "csharp";
    case "java":
      return "java";
    case "js":
      return "javascript";
    case "py":
      return "python";
    case "ts":
      return "typescript";
    default:
      return languageId;
  }
}
