import * as levenshtein from "fastest-levenshtein";
import "fs";
import * as vscode from "vscode";
import { I18nItem } from "./type";
import { readFileSync, readdirSync } from "fs";
import path = require("path");
const stringSimilarity = require("string-similarity");
const _eval = require("eval");

export class GTLocaleProvider implements vscode.InlineValuesProvider {
  onDidChangeInlineValues?: vscode.Event<void> | undefined;
  public dictionary: Map<string, string[]> = new Map();
  public idDcittionary: Map<string, string> = new Map();
  public words: string[] = [];
  public i18nVariableNames: string[] = [
    "i18nEnglish",
    "i18nKorean",
    "i18nJapanese",
    "i18nChinese",
  ];
  public keys: string[] = [];
  provideInlineValues(
    document: vscode.TextDocument,
    viewPort: vscode.Range,
    context: vscode.InlineValueContext,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.InlineValue[]> {
    return;
  }

  constructor() {
    if (!vscode.window.activeTextEditor) {
      return;
    }
  }

  public find(word: string): I18nItem {
    let keys = this.dictionary.get(word) || [];
    return {
      word,
      keys: keys,
      dist: keys.length ?? 0,
    };
  }

  public findById(id: string): I18nItem | undefined {
    let word = this.idDcittionary.get(id);
    if (word === undefined) {
      return undefined;
    }
    return {
      word,
      keys: [id],
      dist: 0,
    };
  }

  public similarWords(word: string, limit?: number): I18nItem[] | undefined {
    let recommands: I18nItem[] = [];
    const wLen = word.length;
    this.words?.forEach((w) => {
      const dist = levenshtein.distance(w, word);
      const sim = stringSimilarity.compareTwoStrings(w, word);
      let score = sim + (0.5 * dist) / Math.max(w.length, wLen);
      if (score > 0.7) {
        let item = this.find(w);
        item.dist = score;
        recommands.push(item);
      }
    });
    recommands.sort((a, b) => b.dist - a.dist);
    if (limit !== undefined && limit > 0 && recommands.length > limit) {
      recommands = recommands.slice(0, limit);
    }

    return recommands;
  }

  public similarKeys(key: string, limit?: number): I18nItem[] | undefined {
    let recommands: I18nItem[] = [];
    const wLen = key.length;
    this.keys?.forEach((k) => {
      const dist = levenshtein.distance(k, key);
      const sim = stringSimilarity.compareTwoStrings(k, key);
      let score = sim + (0.5 * dist) / Math.max(k.length, wLen);
      if (score > 0.7) {
        let item = this.findById(k) as I18nItem;
        item.dist = score;
        recommands.push(item);
      }
    });
    recommands.sort((a, b) => b.dist - a.dist);
    if (limit !== undefined && limit > 0 && recommands.length > limit) {
      recommands = recommands.slice(0, limit);
    }

    return recommands;
  }

  public findNearest(word: string): string | undefined {
    return levenshtein.closest(word, this.words);
  }

  public findNearestId(id: string): string | undefined {
    console.log(id, this.keys.length);
    return levenshtein.closest(id, this.keys);
  }

  private static aux(
    obj: any,
    key: string[],
    categoty: string,
    wordToIdMap?: Map<string, string[]>,
    idToWordMap?: Map<string, string>,
  ) {
    if (wordToIdMap === undefined) {
      wordToIdMap = new Map<string, string[]>();
    }
    if (idToWordMap === undefined) {
      idToWordMap = new Map<string, string>();
    }
    if (typeof obj === "object") {
      for (let k in obj) {
        GTLocaleProvider.aux(
          obj[k],
          key.concat(k),
          categoty,
          wordToIdMap,
          idToWordMap,
        );
      }
    } else {
      if (!wordToIdMap.has(obj)) {
        wordToIdMap.set(obj, []);
      }
      let uniqKey = `${categoty}:${key.join(".")}`;
      wordToIdMap.get(obj)?.push(uniqKey);
      idToWordMap.set(uniqKey, obj);
    }
    return { wordToIdMap, idToWordMap };
  }

  public parseFile(path: string) {
    const wordToIdMap = new Map<string, string[]>();
    const idToWordMap = new Map<string, string>();

    let source = readFileSync(path).toString();
    source =
      `var i18nKorean = undefined; var i18nEnglish = undefined; var i18nJapanese = undefined; var i18nChinese = undefined;` +
      source;
    let lang = _eval(
      source +
        `exports.lang = i18nKorean || i18nEnglish || i18nJapanese || i18nChinese`,
      true,
    ).lang;

    for (let rootKey in lang) {
      GTLocaleProvider.aux(
        lang[rootKey],
        [],
        rootKey,
        wordToIdMap,
        idToWordMap,
      );
    }

    this.dictionary = wordToIdMap;
    this.idDcittionary = idToWordMap;
    this.words = Array.from(wordToIdMap.keys());
    this.keys = Array.from(idToWordMap.keys());
  }
}
