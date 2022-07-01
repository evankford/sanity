import {BaseRange, Transforms} from 'slate'
import {debounce, isEqual} from 'lodash'
import React, {useCallback, useMemo, useState, useEffect, forwardRef} from 'react'
import {Editable as SlateEditable, Slate, ReactEditor, withReact} from '@sanity/slate-react'
import {
  EditorSelection,
  OnBeforeInputFn,
  OnCopyFn,
  OnPasteFn,
  OnPasteResult,
  OnPasteResultOrPromise,
  RenderAnnotationFunction,
  RenderBlockFunction,
  RenderChildFunction,
  RenderDecoratorFunction,
  ScrollSelectionIntoViewFunction,
} from '../types/editor'
import {PortableTextBlock} from '../types/portableText'
import {HotkeyOptions} from '../types/options'
import {isEqualToEmptyEditor, toSlateValue} from '../utils/values'
import {normalizeSelection} from '../utils/selection'
import {toPortableTextRange, toSlateRange} from '../utils/ranges'
import {debugWithName} from '../utils/debug'
import {KEY_TO_SLATE_ELEMENT} from '../utils/weakMaps'
import {Leaf} from './Leaf'
import {Element} from './Element'
import {usePortableTextEditor} from './hooks/usePortableTextEditor'
import {usePortableTextEditorValue} from './hooks/usePortableTextEditorValue'
import {PortableTextEditor} from './PortableTextEditor'
import {createWithEditableAPI, createWithHotkeys, createWithInsertData} from './plugins'
import {useForwardedRef} from './hooks/useForwardedRef'

const debug = debugWithName('component:Editable')

const PLACEHOLDER_STYLE: React.CSSProperties = {
  opacity: 0.5,
  position: 'absolute',
  userSelect: 'none',
  pointerEvents: 'none',
}

const NOOP = () => {
  // Nope
}
type DOMNode = globalThis.Node

const isDOMNode = (value: unknown): value is DOMNode => {
  return value instanceof Node
}

/**
 * Check if the target is editable and in the editor.
 */
export const hasEditableTarget = (
  editor: ReactEditor,
  target: EventTarget | null
): target is DOMNode => {
  return isDOMNode(target) && ReactEditor.hasDOMNode(editor, target, {editable: true})
}

export type PortableTextEditableProps = {
  hotkeys?: HotkeyOptions
  onBeforeInput?: OnBeforeInputFn
  onPaste?: OnPasteFn
  onCopy?: OnCopyFn
  renderAnnotation?: RenderAnnotationFunction
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderDecorator?: RenderDecoratorFunction
  renderPlaceholder?: () => React.ReactNode
  scrollSelectionIntoView?: ScrollSelectionIntoViewFunction
  selection?: EditorSelection
  spellCheck?: boolean
}

const EMPTY_DECORATORS: BaseRange[] = []

export const PortableTextEditable = forwardRef(function PortableTextEditable(
  props: PortableTextEditableProps & Omit<React.HTMLProps<HTMLDivElement>, 'as' | 'onPaste'>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>
) {
  const {
    hotkeys,
    onBeforeInput,
    onPaste,
    onCopy,
    renderAnnotation,
    renderBlock,
    renderChild,
    renderDecorator,
    renderPlaceholder,
    selection: propsSelection,
    scrollSelectionIntoView,
    spellCheck,
    ...restProps
  } = props

  const portableTextEditor = usePortableTextEditor()
  const value = usePortableTextEditorValue()
  const ref = useForwardedRef(forwardedRef)
  const slateEditor = portableTextEditor.slateInstance

  const {change$, keyGenerator, portableTextFeatures, readOnly} = portableTextEditor

  const blockType = portableTextFeatures.types.block

  const placeHolderBlock = useMemo(
    () => ({
      _type: blockType.name,
      _key: keyGenerator(),
      style: portableTextFeatures.styles[0].value,
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: keyGenerator(),
          text: '',
          marks: [],
        },
      ],
    }),
    [blockType.name, keyGenerator, portableTextFeatures.styles]
  )

  const isEmpty = useMemo(
    () => !value || isEqualToEmptyEditor(value, portableTextFeatures),
    [portableTextFeatures, value]
  )

  const initialValue = useMemo(
    () =>
      toSlateValue(
        getValueOrInitialValue(value, [placeHolderBlock]),
        portableTextEditor,
        KEY_TO_SLATE_ELEMENT.get(slateEditor)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placeHolderBlock, slateEditor, blockType.name] // Note that 'value' is deliberately left out here.
  )

  // React/UI-spesific plugins
  const withInsertData = useMemo(
    () => createWithInsertData(change$, portableTextFeatures, keyGenerator),
    [change$, keyGenerator, portableTextFeatures]
  )
  const withHotKeys = useMemo(
    () => createWithHotkeys(portableTextFeatures, keyGenerator, portableTextEditor, hotkeys),
    [hotkeys, keyGenerator, portableTextEditor, portableTextFeatures]
  )

  // Create the PortableTextEditor API
  const withEditableAPI = useMemo(
    () => createWithEditableAPI(portableTextEditor, portableTextFeatures, keyGenerator),
    [keyGenerator, portableTextEditor, portableTextFeatures]
  )

  // Update the Slate instance's plugins which are dependent on props for Editable
  useMemo(
    () => withEditableAPI(withInsertData(withHotKeys(withReact(slateEditor)))),
    [slateEditor, withEditableAPI, withHotKeys, withInsertData]
  )

  // Track composing
  const [isComposing, setIsComposing] = useState(false)
  const unsetIsComposingDebounced = useMemo(
    () =>
      debounce(() => {
        setIsComposing(false)
      }, 1000),
    [setIsComposing]
  )

  const renderElement = useCallback(
    (eProps) => (
      <Element
        {...eProps}
        portableTextFeatures={portableTextFeatures}
        readOnly={readOnly}
        renderBlock={renderBlock}
        renderChild={renderChild}
        spellCheck={spellCheck}
      />
    ),
    [portableTextFeatures, spellCheck, readOnly, renderBlock, renderChild]
  )

  const renderLeaf = useCallback(
    (lProps) => {
      if (renderPlaceholder && lProps.leaf.placeholder && lProps.text.text === '') {
        return (
          <>
            <div style={PLACEHOLDER_STYLE} contentEditable={false}>
              {renderPlaceholder()}
            </div>
            <Leaf
              {...lProps}
              keyGenerator={keyGenerator}
              portableTextFeatures={portableTextFeatures}
              renderAnnotation={renderAnnotation}
              renderChild={renderChild}
              renderDecorator={renderDecorator}
              readOnly={readOnly}
            />
          </>
        )
      }
      return (
        <Leaf
          {...lProps}
          keyGenerator={keyGenerator}
          portableTextFeatures={portableTextFeatures}
          renderAnnotation={renderAnnotation}
          renderChild={renderChild}
          renderDecorator={renderDecorator}
          readOnly={readOnly}
        />
      )
    },
    [
      keyGenerator,
      portableTextFeatures,
      readOnly,
      renderAnnotation,
      renderChild,
      renderDecorator,
      renderPlaceholder,
    ]
  )

  // Restore value from props
  useEffect(() => {
    if (isComposing) {
      debug('Not setting value from props (is composing)')
      return
    }
    const defaultValue = [placeHolderBlock]
    const slateValueFromProps = toSlateValue(
      getValueOrInitialValue(value, defaultValue),
      portableTextEditor
    )
    if (value) {
      const originalChildren = [...slateEditor.children]
      slateValueFromProps.forEach((n, i) => {
        const existing = originalChildren[i]
        if (existing && !isEqual(n, existing)) {
          originalChildren.splice(i, 1, n)
        } else if (!existing) {
          originalChildren.push(n)
        }
      })
      if (originalChildren.length > slateValueFromProps.length) {
        originalChildren.splice(
          slateValueFromProps.length,
          slateEditor.children.length - slateValueFromProps.length
        )
      }
      slateEditor.children = originalChildren
    } else {
      slateEditor.children = slateValueFromProps
    }
    debug(`Setting value from props`, value)
    slateEditor.onChange()
  }, [isComposing, placeHolderBlock, portableTextEditor, slateEditor, value])

  // Restore selection from props
  useEffect(() => {
    if (
      propsSelection &&
      !isEqual(
        propsSelection,
        toPortableTextRange(value, slateEditor.selection, portableTextFeatures)
      )
    ) {
      debug(`Selection from props ${JSON.stringify(propsSelection)}`)
      const normalizedSelection = normalizeSelection(propsSelection, value)
      if (normalizedSelection !== null) {
        debug(`Normalized selection from props ${JSON.stringify(normalizedSelection)}`)
        const slateRange = toSlateRange(normalizedSelection, slateEditor)
        if (slateRange) {
          Transforms.select(slateEditor, slateRange)
          slateEditor.onChange()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slateEditor, propsSelection]) // Note that  'value' is deliberately left out here.

  // Set initial selection from props
  useEffect(() => {
    if (propsSelection) {
      PortableTextEditor.select(portableTextEditor, propsSelection)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only initial

  // Handle from props onCopy function
  const handleCopy = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>): void | ReactEditor => {
      if (onCopy) {
        const result = onCopy(event)
        // CopyFn may return something to avoid doing default stuff
        if (result !== undefined) {
          event.preventDefault()
        }
      }
    },
    [onCopy]
  )

  // Handle incoming pasting events in the editor
  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>): Promise<void> | void => {
      if (!slateEditor.selection) {
        return
      }
      if (onPaste) {
        const resolveOnPasteResultOrError = (): OnPasteResultOrPromise | Error => {
          try {
            return onPaste({
              event,
              value: PortableTextEditor.getValue(portableTextEditor),
              path: slateEditor.selection?.focus.path || [],
              portableTextFeatures, // New key added in v.2.23.2
              type: portableTextFeatures.types.portableText, // For legacy support
            })
          } catch (error) {
            return error as Error
          }
        }
        // Resolve it as promise (can be either async promise or sync return value)
        const resolved: OnPasteResultOrPromise | Error = Promise.resolve(
          resolveOnPasteResultOrError()
        )
        resolved
          .then((result: OnPasteResult) => {
            debug('Custom paste function from client resolved', result)
            change$.next({type: 'loading', isLoading: true})
            if (!result) {
              return
            }
            if (result instanceof Error) {
              throw result
            }
            if (result && result.insert) {
              event.preventDefault() // Stop the chain
              slateEditor.insertFragment(toSlateValue(result.insert, {portableTextFeatures}))
              change$.next({type: 'loading', isLoading: false})
              return
            }
            console.warn('Your onPaste function returned something unexpected:', result)
          })
          .catch((error) => {
            change$.next({type: 'loading', isLoading: false})
            console.error(error) // eslint-disable-line no-console
            return error
          })
      }
      event.preventDefault()
      slateEditor.insertData(event.clipboardData)
    },
    [change$, onPaste, portableTextEditor, portableTextFeatures, slateEditor]
  )

  const handleOnFocus = useCallback(() => {
    change$.next({type: 'focus'})
  }, [change$])

  const handleOnBlur = useCallback(() => {
    change$.next({type: 'blur'})
  }, [change$])

  const handleOnBeforeInput = useCallback(
    (event: Event) => {
      setIsComposing(true)
      unsetIsComposingDebounced()
      if (onBeforeInput) {
        onBeforeInput(event)
      }
    },
    [unsetIsComposingDebounced, onBeforeInput]
  )

  const handleKeyDown = slateEditor.pteWithHotKeys

  const scrollSelectionIntoViewToSlate = useMemo(() => {
    // Use slate-react default scroll into view
    if (scrollSelectionIntoView === undefined) {
      return undefined
    }
    // Disable scroll into view totally
    if (scrollSelectionIntoView === null) {
      return NOOP
    }
    // Translate PortableTextEditor prop fn to Slate plugin fn
    return (editor: ReactEditor, domRange: Range) => {
      scrollSelectionIntoView(portableTextEditor, domRange)
    }
  }, [portableTextEditor, scrollSelectionIntoView])

  const decorate = useCallback(() => {
    if (isEmpty && slateEditor.children.length <= 1) {
      return [
        {
          anchor: {
            path: [0, 0],
            offset: 0,
          },
          focus: {
            path: [0, 0],
            offset: 0,
          },
          placeholder: true,
        },
      ]
    }
    return EMPTY_DECORATORS
  }, [isEmpty, slateEditor.children])

  // The editor
  const slateEditable = useMemo(
    () => (
      <Slate onChange={NOOP} editor={slateEditor} value={initialValue}>
        <SlateEditable
          autoFocus={false}
          className="pt-editable"
          decorate={decorate}
          onBlur={handleOnBlur}
          onCopy={handleCopy}
          onDOMBeforeInput={handleOnBeforeInput}
          onFocus={handleOnFocus}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          readOnly={readOnly}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          scrollSelectionIntoView={scrollSelectionIntoViewToSlate}
        />
      </Slate>
    ),
    [
      slateEditor,
      initialValue,
      decorate,
      handleOnBlur,
      handleCopy,
      handleOnBeforeInput,
      handleOnFocus,
      handleKeyDown,
      handlePaste,
      readOnly,
      renderElement,
      renderLeaf,
      scrollSelectionIntoViewToSlate,
    ]
  )
  if (!portableTextEditor) {
    return null
  }
  return (
    <div ref={ref} {...restProps}>
      {slateEditable}
    </div>
  )
})

function getValueOrInitialValue(value: unknown, initialValue: PortableTextBlock[]) {
  if (value && Array.isArray(value) && value.length > 0) {
    return value
  }
  return initialValue
}
