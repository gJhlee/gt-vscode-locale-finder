import * as vscode from 'vscode';
import 'fs';
import { readdir, readdirSync, readFileSync } from 'fs';
import path = require('path');
import { join } from 'path';
import * as levenshtein from 'fastest-levenshtein';
import { ConsoleReporter } from '@vscode/test-electron';
import { loadavg } from 'os';
const safeEval = require('safe-eval');



export function activate(context: vscode.ExtensionContext) {

	const provider = new GTLocaleProvider();

	context.subscriptions.push(
		vscode.commands.registerCommand('gtone.i18n', async() => {
			const editor = vscode.window.activeTextEditor;
			await provider.load();

			if (editor) {
				const document = editor.document;
				const selection = editor.selection;
				const quickPick = vscode.window.createQuickPick();

				const word = document.getText(selection);
				const i18nWords: I18nItem = provider.find(word);
				const items: vscode.QuickPickItem[] = [];
				if (i18nWords.keys.length < 1) {
					let similars: I18nItem[] = provider.similarWords(word) || [];
					similars.sort((a, b) => a.dist - b.dist);
					similars.forEach((item) =>{
						item.keys.forEach((key: any) => {
							items.push({ label: item.word, description:key });
						});
					});
					if (similars.length === 0) {
						items.push({ label: "검색된 결과가 없습니다.", description: `전체 단어 개수: ${provider.dictionary.size}` });
					}
				} else {
					i18nWords.keys.forEach((key: any) => {
						items.push({ label: i18nWords.word, description: key });
					});
				}

				quickPick.items = items;
				quickPick.onDidChangeSelection(pickecItem => {
					if (pickecItem[0]) {
						editor.edit(editBuilder => {
							editBuilder.replace(selection, `$.t("${pickecItem[0].description}")`||word);
						});
						quickPick.dispose();
					}
				});
				quickPick.onDidHide(() => quickPick.dispose());
				quickPick.show();
				
			}
		})
	);
}
export function deactivate() { }

interface I18nItem {
	word: string;
	keys: string[];
	dist: number;
}

class GTLocaleProvider implements vscode.InlineValuesProvider {
	onDidChangeInlineValues?: vscode.Event<void> | undefined;
	public dictionary: Map<string, string[]> = new Map();
	public words: string[] = [];
	provideInlineValues(document: vscode.TextDocument, viewPort: vscode.Range, context: vscode.InlineValueContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.InlineValue[]> {
		return;
	}

	constructor() {
		const uri = vscode.window.activeTextEditor!.document.uri;
        let watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(
                vscode.workspace.getWorkspaceFolder(uri)!,
                '**/locales/ko.js'
            ),
            false,
            false,
            false
		);
		
		// this.dictionary = this.getdictionary();
		watcher.onDidChange((e) => {
			console.log("reloading ...");
			this.dictionary = this.getdictionary(e.path);
			console.log(`${this.dictionary.size} words loaded.`);
		});
		watcher.onDidCreate(console.log);
	}

	public load() {
		const uri = vscode.window.activeTextEditor!.document.uri;
		return new Promise((res, rej) => {
			vscode.workspace.findFiles(new vscode.RelativePattern(
				vscode.workspace.getWorkspaceFolder(uri)!,
				'**/locales/ko.js'
			)).then((e) => {
				console.log("loading ...");
				this.dictionary = this.getdictionary(e[0]?.fsPath);
				console.log(`${this.dictionary.size} words loaded.`);
				res(this.dictionary);
			});
		});
	}

	public find(word: string): I18nItem {
		let keys = this.dictionary.get(word) || [];
		return {
			word,
			keys: keys,
			dist: keys.length??0
		};
	}

	public similarWords(word: string): I18nItem[] | undefined {
		const recommands : I18nItem[]= [] ;
		this.words?.forEach(w => {
			const dist = levenshtein.distance(w, word);
			if (dist < 10) {
				let item = this.find(w);
				item.dist = dist;
				recommands.push(item);
			}
		});
		return recommands;
	}

	public findNearest(word: string): string | undefined {
		return levenshtein.closest(word, this.words);
	}

	private fileLocaleFile(workspaceFolder: readonly vscode.WorkspaceFolder[] | undefined, localeFile: string) {

		const ignorePath = ['libs', 'lib', 'css', 'WEB-INF', 'target', 'build', 'java'];
		let fsPath: string | undefined = undefined;

		for (let f of workspaceFolder??[]) {
			let pathStack = [f.uri.fsPath,];
			while (pathStack.length > 0) {
				fsPath = pathStack.pop();
				if (fsPath?.endsWith("locales") || fsPath === undefined) {
					break;
				}
				let files = readdirSync(fsPath, { withFileTypes: true });
				let subDirs = files
					?.filter(file => file.isDirectory() && !file.name.startsWith(".") && !ignorePath.includes(file.name))
					?.map(file => path.join(fsPath as string, file.name));

				pathStack = pathStack.concat(subDirs);
			}
		}

		if (!fsPath) {
			return null;
		}

		let localeFilePath = readdirSync(fsPath).filter(f => f === localeFile)[0];
		return localeFilePath && (join(fsPath, localeFilePath));
	}

	public getdictionary(path:(string|undefined)) {
		const workspaceFolder = vscode.workspace.workspaceFolders;
		const localePath = path || this.fileLocaleFile(workspaceFolder, 'ko.js');
		const dictionary = new Map<string, string[]>();
		if (localePath) {
			const source = readFileSync(localePath).toString();

			let i18nKorean = safeEval(`(()=>{${source};return i18nKorean})()`);
			//flatten
			function aux(obj: any, key: string[], categoty: string) {
				if (typeof obj === 'object') {
					for (let k in obj) {
						aux(obj[k], key.concat(k), categoty);
					}
				} else {
					if (!dictionary.has(obj)) {
						dictionary.set(obj, []);
					}
					dictionary.get(obj)?.push(`${categoty}:${key.join(".")}`);
				}
			}
			
			for (let rootKey in i18nKorean) {
				aux(i18nKorean[rootKey], [], rootKey);
			}
		}
		this.words = Array.from(dictionary.keys());
		return dictionary;
	}
}
