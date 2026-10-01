import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    notebook: {
      toggleAside: () => ReturnType;
      toggleDetails: () => ReturnType;
      setSummary: () => ReturnType;
    };
  }
}

/** <aside> block — marginalia with the red margin bar. */
export const Aside = Node.create({
  name: "aside",
  content: "inline*",
  group: "block",
  defining: true,

  parseHTML() {
    return [{ tag: "aside" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleAside:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});

/** <details> disclosure container. */
export const Details = Node.create({
  name: "details",
  content: "summary block*",
  group: "block",
  defining: true,

  parseHTML() {
    return [{ tag: "details" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleDetails:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: [
                { type: "summary", content: [{ type: "text", text: "details" }] },
                { type: "paragraph" },
              ],
            })
            .run(),
    };
  },
});

/** <summary> heading inside <details>. */
export const Summary = Node.create({
  name: "summary",
  content: "inline*",
  group: "block",
  defining: true,

  parseHTML() {
    return [{ tag: "summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSummary:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
});
