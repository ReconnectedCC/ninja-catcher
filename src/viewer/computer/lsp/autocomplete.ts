"use strict"
import * as monaco from "../../../editor/lua";
import L4RCApiData from "./ApiData";
import { getLastMatch, keys, assign } from "./utils";
import * as vscode from "vscode";

const wordsRegex = /([\w\[\]]+\.[\w\[\]\.]*)/g

export class L4RCAutocomplete implements monaco.languages.CompletionItemProvider {
    constructor(private apiData: L4RCApiData) { }

    public provideCompletionItems(document: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext ,token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
        return new Promise<monaco.languages.CompletionList>((resolve, reject) => {
            let lineText = document.getLineContent(position.lineNumber)
            let lineTillCurrentPosition = lineText.substring(0, position.column)

            let match = getLastMatch(wordsRegex, lineTillCurrentPosition)
            let line = match ? match[1] : ""

            let words = line.split(".")
            words.pop()

            let type = this.apiData.findType(words)

            if (!type || !type.properties) {
                return reject()
            }

            let suggestions = this.toCompletionList(type.properties)
            return resolve(suggestions)
        })
    }

    private toCompletionItems(types: L4RCTypeMap): monaco.languages.CompletionItem[] {
        return keys(types).map(key => this.toCompletionItem(types[key], <string>key))
    }

    private toCompletionList(types: L4RCTypeMap): monaco.languages.CompletionList {
        return {
            suggestions: this.toCompletionItems(types)
        }
    }
    private toCompletionItem(type: L4RCType, key: string): monaco.languages.CompletionItem {
        const { doc, name, mode } = type

        let completionItem = assign(new vscode.CompletionItem(key), {
            detail: "(property) " + key + ": " + type.type,
            documentation: new vscode.MarkdownString(["**"+name+"**", doc, mode].filter(Boolean).join("\n\n")),
            kind: monaco.languages.CompletionItemKind.Property,
            filterText: key + " " + name
        })

        if (type.type === "function") {
            assign(completionItem, {
                detail: "(function) " + name + "("+ (type.args ? Object.keys(type.args).join(", ") : "") + "): " + type.returns,
                kind: monaco.languages.CompletionItemKind.Function,
                documentation: new vscode.MarkdownString([doc, mode].filter(Boolean).join("\n\n")),
            })
        }
        
        else if (type.type === "field") {
            assign(completionItem, {
                detail: "(field) " + name,
                kind: monaco.languages.CompletionItemKind.Field,
            })
        }
        else if (type.type === "class") {
            assign(completionItem, {
                detail: "(class) " + name,
                kind: monaco.languages.CompletionItemKind.Class,
            })
        }
        else if (type.type === "define") {
            assign(completionItem, {
                detail: "(constant) " + type.type,
                kind: monaco.languages.CompletionItemKind.Constant
            })
        }

        return completionItem
    }

}
