import { isLanguageSupported } from "../helpers/langs";

const MODULE_REGEX: { [key: string]: RegExp[] } = {
  csharp: [/(?:using)\s[\S]*;{1}/gm],
  java: [/(?:import)\s[\S]*;{1}/gm],
  javascript: [/(?:import).*;?/gm],
  python: [/(?:import).*\n/gm],
};

export class ModuleGatherer {
  static getModules(
    document: string,
    language: string
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!isLanguageSupported(language)) {
        return reject("Unsupported language");
      }

      const matches = document.match(MODULE_REGEX[language][0]);
      if (matches === null) {
        return resolve(null);
      }

      var moduleText = "";
      matches.forEach((match) => {
        moduleText += match.replace("\n", "") + "\n";
      });

      return resolve(moduleText);
    });
  }
}
