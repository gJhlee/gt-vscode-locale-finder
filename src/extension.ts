import * as vscode from "vscode";
import "fs";
import { GTLocaleProvider } from "./GTLocaleProvider";
import { I18nItem } from "./type";
import { I18nCodeActionProvider } from "./I18nCodeActionProvider";

const localeProvider = new GTLocaleProvider();
const i18nProvider = new I18nCodeActionProvider(localeProvider);
const state = {
  loading: false,
};

function loading() {
  if (state.loading) {
    return;
  }
  vscode.workspace.findFiles("**/{ko,en,ja,zh}.js").then((files) => {
    for (let file of files) {
      localeProvider.parseFile(file.fsPath);
    }
    state.loading = false;
  });
}

function initialize() {
  loading();
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{ko,en,ja,zh}.js",
  );
  watcher.onDidChange((e) => {
    if (!state.loading) {
      loading();
    }
  });
}

initialize();

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension " + context.extension.id + " loaded.");
  const diagnosticCollection =
    vscode.languages.createDiagnosticCollection("gtone");

  context.subscriptions.push(
    vscode.commands.registerCommand("gtone.i18n", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        let selection = editor.selection;
        let extendSelection = new vscode.Selection(
          selection.start.line,
          Math.max(selection.start.character - 1, 0),
          selection.end.line,
          selection.end.character + 1,
        );
        const quickPick = vscode.window.createQuickPick();

        const word = document.getText(selection);
        const extendSelectedWord = document.getText(extendSelection);
        if (
          extendSelectedWord.startsWith(`"`) &&
          extendSelectedWord.endsWith(`"`)
        ) {
          selection = extendSelection;
        }
        const i18nWords: I18nItem = localeProvider.find(word);
        const items: vscode.QuickPickItem[] = [];
        if (i18nWords.keys.length < 1) {
          let similars: I18nItem[] = localeProvider.similarWords(word) || [];
          similars.forEach((item) => {
            item.keys.forEach((key: any) => {
              items.push({
                label: ` ${item.word}`,
                description: `Similarity: ${item.dist.toFixed(2)}`,
                detail: key,
              });
            });
          });
          if (similars.length === 0) {
            items.push({
              label: "검색된 결과가 없습니다.",
              description: `전체 단어 개수: ${localeProvider.dictionary.size}`,
            });
          }
        } else {
          i18nWords.keys.forEach((key: any) => {
            items.push({
              label: i18nWords.word,
              description: "Exactly match",
              detail: key,
            });
          });
        }

        quickPick.items = items;
        quickPick.onDidChangeSelection((pickecItem) => {
          if (pickecItem[0]) {
            editor.edit((editBuilder) => {
              let item: I18nItem = localeProvider.find(pickecItem[0].label);
              editBuilder.replace(
                selection,
                `$.t("${pickecItem[0].detail}")` || word,
              );
            });
            quickPick.dispose();
          }
        });
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
      }
    }),
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("javascript", i18nProvider),
  );
  vscode.workspace.onDidSaveTextDocument((document) => {
    const text = document.getText();
    const regExp = /([a-z0-9A-Z_-]+:([a-z0-9A-Z_-]+\.?)+)/g;

    let match;
    let diagnostics = [];

    while ((match = regExp.exec(text))) {
      if (localeProvider.findById(match[0])) {
        continue;
      }
      const start = document.positionAt(match.index);
      const end = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(start, end);
      const diagnostic = new vscode.Diagnostic(
        range,
        `Not found '${match[0]}'. `,
        vscode.DiagnosticSeverity.Warning,
      );

      diagnostics.push(diagnostic);
    }
    diagnosticCollection.set(document.uri, diagnostics);
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("gtone.i18n.findbyid", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const document = editor.document;
        const content = document
          .getText(editor.selection)
          .replace(/^"|"$/g, "");
        const items: vscode.QuickPickItem[] = [];
        const item = localeProvider.findById(content);
        if (item === undefined) {
          items.push({
            label: `${content}를 찾을 수 없습니다.`,
            description: `전체 단어 개수: ${localeProvider.dictionary.size}`,
          });
        } else {
          items.push({
            label: `${content} -> ${item.word}`,
          });
        }

        const quickPick = vscode.window.createQuickPick();
        quickPick.items = items;
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.show();
      }
    }),
  );
}
export function deactivate() {}
