import {defineType} from '@sanity/types'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {renderObjectInput} from '../../../../../test/form'
import {ObjectInput} from '../ObjectInput'

const fieldsetsTestType = defineType({
  title: 'Fieldsets test',
  name: 'fieldsetsTest',
  type: 'object',
  fieldsets: [
    {name: 'withDefaults', title: 'Fieldset with defaults'},
    {
      name: 'collapsibleWithDefaults',
      title: 'Collapsible fieldset with defaults',
      options: {collapsible: true},
    },
  ],
  fields: [
    {
      name: 'withDefaults1',
      type: 'string',
      fieldset: 'withDefaults',
    },
    {
      name: 'collapsibleWithDefaults1',
      type: 'string',
      fieldset: 'collapsibleWithDefaults',
    },
  ],
})

describe('fieldset with default options', () => {
  it('renders fields in a <fieldset element and includes a <legend', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.queryByTestId('fieldset-withDefaults')
    expect(fieldset).toBeVisible()
    expect(fieldset!.tagName).toBe('FIELDSET')
    const legend = fieldset!.querySelector('legend')
    expect(legend).toBeVisible()
    expect(legend).toContainHTML('Fieldset with defaults')
    const field1 = result.queryByTestId('input-withDefaults1')
    expect(field1).toBeVisible()
    expect(fieldset).toContainElement(field1)
  })

  it('does not render a toggle button for the fieldset legend ', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.container.querySelector('fieldset')
    expect(fieldset).toBeVisible()
    const legend = fieldset!.querySelector('legend')
    expect(legend).toBeVisible()
    expect(legend!.querySelector('button')).toBeNull()
  })
})

describe('collapsible fieldset with default options', () => {
  it('renders fields in a <fieldset element and includes a <legend', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')
    expect(fieldset).toBeVisible()
    expect(fieldset!.tagName).toBe('FIELDSET')
    const legend = fieldset!.querySelector('legend')
    expect(legend).toBeVisible()
    expect(legend).toContainHTML('Collapsible fieldset with defaults')
  })

  it('renders a button for the fieldset legend ', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')
    expect(fieldset).toBeVisible()
    const toggleButton = fieldset!.querySelector('legend button')
    expect(toggleButton).toBeVisible()
  })

  it('renders collapsed initially', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')
    expect(fieldset).toBeVisible()
    const field1 = result.queryByTestId('input-collapsibleWithDefaults1')
    expect(field1).toBeNull()
  })

  it('expands if focus path targets a field inside the fieldset', () => {
    const {result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => (
        <ObjectInput {...inputProps} focusPath={['collapsibleWithDefaults1']} />
      ),
    })

    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeVisible()
  })

  it('emits a focus path targeting the field when clicking toggle button', () => {
    const {onFocus, result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => <ObjectInput {...inputProps} />,
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')
    expect(fieldset).toBeVisible()
    const toggleButton = fieldset!.querySelector('legend button')

    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeNull()

    expect(toggleButton).toBeDefined()
    userEvent.click(toggleButton!)
    expect(onFocus).toHaveBeenCalledTimes(1)
    expect(onFocus).toHaveBeenCalledWith(['collapsibleWithDefaults1'])
  })

  it('toggles collapse/expand despite focus path targeting field inside', () => {
    const {rerender, result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => (
        <ObjectInput {...inputProps} focusPath={['collapsibleWithDefaults1']} />
      ),
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')

    // visible because of focus path
    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeVisible()

    const toggleButton = fieldset!.querySelector('legend button')
    expect(toggleButton).toBeDefined()
    userEvent.click(toggleButton!)
    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeNull()

    // click to expand again
    userEvent.click(toggleButton!)
    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeVisible()

    // move focus to another field should keep it open
    rerender((inputProps) => <ObjectInput {...inputProps} focusPath={[]} />)

    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeVisible()

    // collapse again
    userEvent.click(toggleButton!)

    // move focus to a field inside again should make it expand
    rerender((inputProps) => (
      <ObjectInput {...inputProps} focusPath={['collapsibleWithDefaults1']} />
    ))
    expect(result.queryByTestId('input-collapsibleWithDefaults1')).toBeVisible()
  })

  it('does not emit a new focus path when being collapsed', () => {
    // Note: this is important because ObjectFieldsets are "virtual", e.g. they are UI only and does
    // not represent a location in the document and putting focus on the parent document node will
    // in some cases create "focus jumps"

    const {onFocus, result} = renderObjectInput({
      fieldDefinition: fieldsetsTestType,
      render: (inputProps) => (
        <ObjectInput {...inputProps} focusPath={['collapsibleWithDefaults1']} />
      ),
    })

    const fieldset = result.queryByTestId('fieldset-collapsibleWithDefaults')

    const toggleButton = fieldset!.querySelector('legend button')
    expect(toggleButton).toBeDefined()
    userEvent.click(toggleButton!)
    expect(onFocus).not.toHaveBeenCalled()
  })
})