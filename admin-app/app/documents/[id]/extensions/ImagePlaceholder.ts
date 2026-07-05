import { Node, mergeAttributes } from '@tiptap/core';

/**
 * ImagePlaceholder — TipTap Node spec that renders the AI-injected
 * `<div class="image-placeholder" data-caption="...">` blocks as a real,
 * clickable node the user can fill with a local image.
 *
 * Why we need a Node and not just DOM manipulation:
 *   TipTap / ProseMirror parses HTML strictly against the editor schema.
 *   If a div is not declared in any extension, the parser either drops it
 *   or wraps it in a generic node that doesn't round-trip the data-caption
 *   attribute. Defining a node gives us:
 *     - persistence (saved in content_json, survives reload)
 *     - a stable React mount for the click handler
 *     - HTML re-serialization that keeps data-caption intact
 *
 * Once the user uploads an image, we `setUploadedSrc(...)` and the node
 * switches to rendered mode. The original caption stays as figcaption.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imagePlaceholder: {
      insertImagePlaceholder: (caption: string) => ReturnType;
      setUploadedSrc: (pos: number, src: string) => ReturnType;
    };
  }
}

export const ImagePlaceholder = Node.create({
  name: 'imagePlaceholder',
  group: 'block',
  atom: true, // treated as a single unit; cursor jumps over it
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      caption: {
        default: 'Image',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-caption') || element.textContent || 'Image',
        renderHTML: (attributes: { caption?: string }) => ({
          'data-caption': attributes.caption ?? 'Image',
        }),
      },
      uploadedSrc: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-uploaded-src'),
        renderHTML: (attributes: { uploadedSrc?: string | null }) =>
          attributes.uploadedSrc ? { 'data-uploaded-src': attributes.uploadedSrc } : {},
      },
    };
  },

  parseHTML() {
    // Match either the AI-inserted placeholder OR a previously-uploaded figure
    // (so reloads of filled nodes still render correctly).
    return [
      {
        tag: 'div.image-placeholder',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            caption: element.getAttribute('data-caption') || 'Image',
            uploadedSrc: null,
          };
        },
      },
      {
        tag: 'figure[data-uploaded-src]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            caption: element.getAttribute('data-caption') || '',
            uploadedSrc: element.getAttribute('data-uploaded-src'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Re-emit the same div the AI originally injected — the existing
    // handleEditorClick handler still works because it walks the live DOM
    // for `.image-placeholder`.
    const caption = (node.attrs as { caption?: string }).caption || 'Image';
    const uploaded = (node.attrs as { uploadedSrc?: string | null }).uploadedSrc;

    if (uploaded) {
      return [
        'figure',
        mergeAttributes(HTMLAttributes, {
          class: 'image-placeholder-uploaded my-6 text-center',
          'data-caption': caption,
          'data-uploaded-src': uploaded,
        }),
        ['img', { src: uploaded, alt: caption, class: 'mx-auto rounded-lg max-w-full shadow-md' }],
        ['figcaption', { class: 'text-xs text-slate-400 mt-2 italic' }, caption],
      ];
    }

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class:
          'image-placeholder bg-slate-900 border border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer my-4 hover:border-emerald-500 transition',
      }),
      ['span', { class: 'text-2xl' }, '📷'],
      ['p', { class: 'text-xs text-slate-400 mt-1 font-sans' }, `Cliquez pour insérer l'image : ${caption}`],
    ];
  },

  addCommands() {
    return {
      insertImagePlaceholder:
        (caption: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { caption },
          });
        },
      setUploadedSrc:
        (pos: number, src: string) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, uploadedSrc: src });
          }
          return true;
        },
    };
  },
});