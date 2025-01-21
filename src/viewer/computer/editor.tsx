import * as monaco from "../../editor/lua";
import { Component, h } from "preact";
import type { Settings } from "../settings";
import { editorView } from "../styles.css";
import { L4RCAutocomplete } from "./lsp/autocomplete";
import L4RCApiData from "./lsp/ApiData";

let monacoVal: typeof monaco | null = null;

export type Setup = (model: monaco.editor.ITextModel) => void;
export type Model = {
  resolved: true,
  text: monaco.editor.ITextModel,
  view: monaco.editor.ICodeEditorViewState | null,
};

export type LazyModel = Model | {
  resolved: false,
  contents: string,
  name: string,
  setup: Setup,
  promise: Promise<Model>,
};

let unique = 0;

const modelFactory = (m: typeof monaco, out: {}, contents: string, name: string, setup: Setup): Model => {
  unique++; // We keep a unique id to ensure the Uri is not repeated.
  const l4RCApiData = new L4RCApiData('/');
  m.languages.registerCompletionItemProvider({ language: "lua", scheme: "file" }, new L4RCAutocomplete (l4RCApiData));
  const text = m.editor.createModel(contents, undefined, m.Uri.file(`f${unique.toString(16)}/${name}`));

  text.updateOptions({ trimAutoWhitespace: true });
  text.detectIndentation(true, 2);
  setup(text);

  const model = out as Model;
  model.resolved = true;
  model.text = text;
  model.view = null;
  return model;
};

const forceModel = (model: LazyModel): Model => {
  if (model.resolved) return model;

  const resolved = modelFactory(monacoVal!, model, model.contents, model.name, model.setup);

  const old: { contents?: string, mode?: string, setup?: Setup } = model;
  delete old.contents;
  delete old.mode;
  delete old.setup;

  return resolved;
};

export const createModel = (contents: string, name: string, setup: Setup): LazyModel => {
  if (monacoVal) return modelFactory(monacoVal, {}, contents, name, setup);

  const model: LazyModel = {
    resolved: false, contents, name, setup,
    promise: import("../../editor/lua").then(m => {
      monacoVal = m;
      return forceModel(model);
    }),
  };
  return model;
};

export const getVersion = (model: LazyModel) => model.resolved ? model.text.getAlternativeVersionId() : undefined;

export const setContents = (model: LazyModel, contents: string) => {
  if (model.resolved) {
    model.text.setValue(contents);
  } else {
    model.contents = contents;
  }
};

export const disposeModel = (model: LazyModel) => {
  if (model.resolved) {
    model.text.dispose();
  } else {
    model.promise.then(disposeModel);
  }
};

export type EditorProps = {
  // From the main state
  settings: Settings,
  focused: boolean,

  // From the computer session
  model: LazyModel,
  readOnly: boolean,

  // A set of actions to call
  onChanged: (dirty: boolean, id: number) => void,
  doSave: (contents: string) => void,
  doClose: () => void,
};

export default class Editor extends Component<EditorProps, {}> {
  private editor?: monaco.editor.IStandaloneCodeEditor;
  private editorPromise?: Promise<void>;

  public componentDidMount() {
    window.addEventListener("resize", this.onResize);
    this.setupEditor();
  }

  private setupEditor() {
    if (!monacoVal) {
      const promise = this.editorPromise = import("../../editor/lua")
        .then(m => {
          monacoVal = m;
          if (this.editorPromise !== promise) return;
          this.setupEditor();
        })
        .catch(err => console.error(err));
      // TODO: Actually decent handling.
      return;
    }

    this.editorPromise = undefined;

    // Clear the body of any elements
    const base = this.base as HTMLElement;
    while (base.firstChild) base.firstChild.remove();

    this.editor = monacoVal.editor.create(base, {
      roundedSelection: false,
      autoIndent: "full",
    });

    this.editor.addAction({
      id: "save",
      label: "Save",
      keybindings: [
        monacoVal.KeyMod.CtrlCmd | monacoVal.KeyCode.KeyS,
      ],
      contextMenuGroupId: "file",
      contextMenuOrder: 1.5,
      run: editor => {
        if (this.props.settings.trimWhitespace) {
          editor.getAction("editor.action.trimTrailingWhitespace").run();
        }
        this.props.doSave(editor.getValue());
      },
    });

    this.syncOptions();
  }

  public componentWillUnmount() {
    window.removeEventListener("resize", this.onResize);

    if (!this.editor) return;

    // Save the view state back to the model
    forceModel(this.props.model).view = this.editor.saveViewState();

    // We set a new session to prevent destroying it when losing the editor
    this.editor.dispose();
  }

  public componentWillUpdate() {
    // Save the view state back to the model
    if (!this.editor) return;

    forceModel(this.props.model).view = this.editor.saveViewState();
  }

  public componentDidUpdate() {
    if (!this.editor) return;
    this.syncOptions();
  }

  private syncOptions() {
    if (!this.editor) return;

    const { settings, readOnly } = this.props;
    const model = forceModel(this.props.model);

    this.editor.setModel(model.text);
    if (model.view) this.editor.restoreViewState(model.view);

    this.editor.updateOptions({
      renderWhitespace: settings.showInvisible ? "boundary" : "none",
      readOnly,
    });

    monacoVal!.editor.setTheme(settings.darkMode ? "vs-dark" : "vs");

    // TODO: Tab size, trim auto whitespace

    if (this.props.focused) this.editor.focus();
  }

  public render() {
    return <div class={editorView}></div>;
  }

  /**
   * When the window resizes, we also need to update the editor's dimensions.
   */
  private onResize = () => this.editor?.layout();
}
