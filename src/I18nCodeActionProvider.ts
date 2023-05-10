import * as vscode from "vscode";
import { GTLocaleProvider } from "./GTLocaleProvider";

export class I18nCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private localeProvider: GTLocaleProvider) {}
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context?: vscode.CodeActionContext,
    token?: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const text = document.getText(range);
    const codeActions: vscode.CodeAction[] = [];
    context?.diagnostics.forEach((diagnostic) => {
      if (range.contains(diagnostic.range)) {
        let similars = this.localeProvider.similarKeys(text, 5);
        similars?.forEach((similar) => {
          const fixAction = new vscode.CodeAction(
            `replace with ${similar.keys[0]} ("${similar.word}")`,
            vscode.CodeActionKind.QuickFix,
          );
          fixAction.edit = new vscode.WorkspaceEdit();
          fixAction.edit.replace(
            document.uri,
            diagnostic.range,
            similar.keys[0],
          );
          fixAction.diagnostics = [diagnostic];
          codeActions.push(fixAction);
        });
        if (similars) {
        }
      }
    });

    return codeActions;
  }
}
