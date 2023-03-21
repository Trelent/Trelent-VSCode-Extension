import * as path from "path";

const supportedLangs = ["csharp", "java", "javascript", "typescript", "python"];

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
    case "js":
      return "javascript";
    case "ts":
      return "typescript";
    case "py":
      return "python";
    case "java":
      return "java";
    default:
      return languageId;
  }
}
