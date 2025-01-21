/*
"use strict"
import * as monaco from "../../../editor/lua";
import * as vscode from 'vscode'
import L4RCApiData from "./ApiData"
import { getLastMatch } from "./utils"

const { isArray } = Array
const { assign, keys } = Object

const wordsRegex = /([\w\[\]]+\.*[\w\[\]\.]*)/g

export class L4RCHover extends monaco.Adapter implements monaco.languages.HoverProvider {
    constructor(private apiData: L4RCApiData) { }

    provideHover(document: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.Hover> {
        return new Promise<monaco.languages.Hover>((resolve, reject) => {
            let lineText = document.getLineContent(position.lineNumber)
            const offset = document.getOffsetAt(position);
            let wordRange = document.getWordAtPosition(position)


            if (!wordRange) return null

            let lineTillCurrentWord = lineText.substr(0, wordRange.endColumn)
            let match = getLastMatch(wordsRegex, lineTillCurrentWord)
            let wordsStr = match ? match[1] : null

            if (!wordsStr) return null

            let words = wordsStr.split(".")
            let word = words.pop()
            let type = this.apiData.findType(words)

            if (!type) return null

            let target: { type?: string, name?: string, args?: any, returns?: string, doc?: string } = {}

            if (word && type.properties && type.properties[word]) {
                target = type.properties[word]
            } else if (word && type[word]) {
                target = type[word]
            } else if (!target || (!target.type && !target.name)) {
                return null
            }

            let content = "```javascript\n(property) " + word + ": " + target.type + "\n```"

            if (target.type === "function") {
                content = "```javascript\n(function) " + target.name + "(" + Object.keys(target.args).join(", ") + "): " + target.returns + "\n```"
            }
            else if (target.type === "field") {
                content = "```javascript\n(field) " + target.name + "\n```"
            }
            else if (target.type === "class") {
                content = "```javascript\n(class) " + target.name + "\n```"
            }
            else if (target.type === "define") {
                content = "```javascript\n(define) " + word + "\n```"
            }


            if (target.name && target.name !== word) {
                content = content + "\n\n" + `**${target.name}**`
            }

            if (target.doc) {
                content += "\n\n" + target.doc
            }

            resolve({ contents: [{ value: content }], range: new monaco.Range(wordRange., wordRange.startColumn, wordRange.endLineNumber, wordRange.endColumn) })
        })
    }
}
*/