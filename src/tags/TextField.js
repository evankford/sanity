import React, {PropTypes} from 'react'
import lodash from 'lodash'

import styles from 'style:@sanity/components/tags/textfield'
import Label from 'component:@sanity/components/labels/default'

export default class TagsTextField extends React.Component {
  static propTypes = {
    label: PropTypes.string.isRequired,
    addTag: PropTypes.func.isRequired,
    removeTag: PropTypes.func.isRequired,
    error: PropTypes.bool,
    focus: PropTypes.func,
    showClearButton: PropTypes.bool,
    tags: PropTypes.arrayOf(PropTypes.shape(
      PropTypes.string
    ))
  }

  static defaultProps = {
    value: '',
    tags: [],
  }

  constructor(props, context) {
    super(props, context)
    this.handleKeyPress = this.handleKeyPress.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleSetFocus = this.handleSetFocus.bind(this)
    this.handleFocus = this.handleFocus.bind(this)
    this.handleBlur = this.handleBlur.bind(this)
    this.handleKeyUp = this.handleKeyUp.bind(this)

    this.state = {
      length: 4,
      isFocused: false
    }
  }

  addTag(title) {
    this.props.addTag(title)
  }

  removeTag(i) {
    this.props.removeTag(i)
  }

  handleKeyDown(event) {
    const value = this._input.value
    this.setState({
      length: value.length > 3 ? value.length : 3
    })
  }

  handleKeyUp(event) {
    // Can not handle Backspace on keyPress
    const value = this._input.value
    if (event.key == 'Backspace' && value == '') {
      this.removeTag(this.props.tags.length - 1)
    }
  }

  handleKeyPress(event) {
    const value = this._input.value

    if (event.key == 'Enter') {
      this.addTag(value)
      this._input.value = ''
    }
  }

  handleSetFocus() {
    this._input.focus()
  }

  handleFocus() {
    this.setState({
      isFocused: true
    })
  }

  handleBlur() {
    const value = this._input.value
    if (value) {
      this.addTag(value)
      this._input.value = ''
    }
    this.setState({
      isFocused: false
    })
  }

  componentWillMount() {
    this._inputId = lodash.uniqueId('DefaultTextField')
  }

  render() {
    const {tags, label} = this.props
    const setInput = component => {
      this._input = component
    }
    return (
      <div className={`${styles.root} ${this.state.isFocused ? styles.isFocused : 'noFocus'}`}>
        <Label className={styles.label} htmlFor={this._inputId}>{label}</Label>
        <div className={`${styles.inner}`}>
          <div className={styles.content} onClick={this.handleSetFocus}>
            <ul className={styles.tags}>
              {
                tags && tags.map((tag, i) => {
                  return (
                    <li key={i} className={styles.tag}>
                      {tag}
                      <a
                        onClick={this.removeTag.bind(this, i)}
                        className={styles.clearTag}
                      >
                        ×
                      </a>
                    </li>
                  )
                })
              }
            </ul>
            <input
              className={styles.input}
              onKeyDown={this.handleKeyDown}
              onKeyPress={this.handleKeyPress}
              style={{width: `${this.state.length * 0.8}em`}}
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
              onKeyUp={this.handleKeyUp}
              ref={setInput}
              id={this._inputId}
            />
          </div>
        </div>
      </div>
    )
  }
}
