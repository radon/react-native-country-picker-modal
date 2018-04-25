// @flow
/* eslint import/newline-after-import: 0 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import SafeAreaView from 'react-native-safe-area-view'

import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Text,
  TextInput,
  ListView,
  ScrollView,
  Platform
} from 'react-native'

import Fuse from 'fuse.js'

import cca2List from '../data/cca2'
import { getHeightPercent } from './ratio'
import CloseButton from './CloseButton'
import countryPickerStyles from './CountryPicker.style'
import KeyboardAvoidingView from './KeyboardAvoidingView'

let countries = null
let Emoji = null
let styles = {}

let isEmojiable = false

const FLAG_TYPES = {
  flat: 'flat',
  emoji: 'emoji'
}

const setCountries = flagType => {
  /* if (typeof flagType !== 'undefined') {
    isEmojiable = flagType === FLAG_TYPES.emoji
  } */

  /* if (isEmojiable) {
    countries = require('../data/countries-emoji')
    Emoji = require('./emoji').default
  } else { */
    countries = require('../data/countries')
    Emoji = <View />
  // }
}

const ds = new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 })

setCountries()

export const getAllCountries = () =>
  cca2List.map(cca2 => ({ ...countries[cca2], cca2 }))

export default class CountryPicker extends Component {
  static propTypes = {
    cca2: PropTypes.string.isRequired,
    translation: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onClose: PropTypes.func,
    onOpen: PropTypes.func,
    closeable: PropTypes.bool,
    filterable: PropTypes.bool,
    children: PropTypes.node,
    countryList: PropTypes.array,
    excludeCountries: PropTypes.array,
    styles: PropTypes.object,
    filterPlaceholder: PropTypes.string,
    autoFocusFilter: PropTypes.bool,
    emptyChoiceText: PropTypes.string,
    // to provide a functionality to disable/enable the onPress of Country Picker.
    disabled: PropTypes.bool,
    filterPlaceholderTextColor: PropTypes.string,
    closeButtonImage: PropTypes.element,
    transparent: PropTypes.bool,
    animationType: PropTypes.oneOf(['slide', 'fade', 'none']),
    flagType: PropTypes.oneOf(Object.values(FLAG_TYPES)),
    hideAlphabetFilter: PropTypes.bool,
    renderFilter: PropTypes.func
  }

  static defaultProps = {
    translation: 'eng',
    countryList: cca2List,
    excludeCountries: [],
    filterPlaceholder: 'Filter',
    autoFocusFilter: true,
    transparent: false,
    emptyChoiceText: '',
    animationType: 'none'
  }

  static renderEmojiFlag(cca2, emojiStyle) {
    return (
      <Text style={[styles.emojiFlag, emojiStyle]} allowFontScaling={false}>
        {cca2 !== '' && countries[cca2.toUpperCase()] ? (
          <Emoji name={countries[cca2.toUpperCase()].flag} />
        ) : null}
      </Text>
    )
  }

  static renderImageFlag(cca2, imageStyle) {
    return cca2 !== '' ? (
      <Image
        style={[styles.imgStyle, imageStyle]}
        source={{ uri: countries[cca2].flag }}
      />
    ) : null
  }

  static renderFlag(cca2, itemStyle, emojiStyle, imageStyle) {
    return (
      <View style={[styles.itemCountryFlag, itemStyle]}>
        {isEmojiable
          ? CountryPicker.renderEmojiFlag(cca2, emojiStyle)
          : CountryPicker.renderImageFlag(cca2, imageStyle)}
      </View>
    )
  }

  constructor(props) {
    super(props)
    setCountries(props.flagType)
    let countryList = [...props.countryList]
    const excludeCountries = [...props.excludeCountries]

    countryList = countryList.filter(c => !excludeCountries.includes(c))
    // excludeCountries.forEach(excludeCountry => {
    //   const index = countryList.indexOf(excludeCountry)

    //   if (index !== -1) {
    //     countryList.splice(index, 1)
    //   }
    // })

    // Sort country list
    countryList = this.orderCountryList(countryList)

    this.state = {
      modalVisible: false,
      cca2List: countryList,
      dataSource: ds.cloneWithRows([null, ...countryList]),
      filter: '',
      letters: this.getLetters(countryList)
    }

    if (this.props.styles) {
      Object.keys(countryPickerStyles).forEach(key => {
        styles[key] = StyleSheet.flatten([
          countryPickerStyles[key],
          this.props.styles[key]
        ])
      })
      styles = StyleSheet.create(styles)
    } else {
      styles = countryPickerStyles
    }

    this.fuse = this.generateFuse(countryList)
  }

  componentDidMount () {
    this.updateCountryList(this.props.countryList, this.props.excludeCountries)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.countryList !== this.props.countryList || nextProps.excludeCountries !== this.props.excludeCountries) {
      this.updateCountryList(nextProps.countryList, nextProps.excludeCountries)
    }
  }

  orderCountryList = (countryList) => (
    countryList
    .map(c => [c, this.getCountryName(countries[c])])
    .sort((a, b) => {
      if (a[1] < b[1]) return -1
      if (a[1] > b[1]) return 1
      return 0
    })
    .map(c => c[0])
  )
  
  generateFuse = (countryList) => {
    return new Fuse(
      countryList.reduce(
        (acc, item) => [
          ...acc,
          { id: item, name: this.getCountryName(countries[item]) }
        ],
        []
      ),
      {
        shouldSort: true,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: ['name'],
        id: 'id'
      }
    )
  }

  updateCountryList = (countryList, excludeCountries = []) => {
    const cca2List = this.orderCountryList(countryList).filter(c => !excludeCountries.includes(c))
    this.setState({
      cca2List,
      dataSource: ds.cloneWithRows(cca2List)
    }, () => {
      this.fuse = this.generateFuse(cca2List)
    })
  }

  onSelectEmpty() {
    this.setState({
      modalVisible: false,
      filter: '',
      dataSource: ds.cloneWithRows([null, ...this.state.cca2List])
    })

    this.props.onChange(null)
  }

  onSelectCountry(cca2) {
    this.setState({
      modalVisible: false,
      filter: '',
      dataSource: ds.cloneWithRows([null, ...this.state.cca2List])
    })

    this.props.onChange({
      cca2,
      ...countries[cca2],
      flag: undefined,
      name: this.getCountryName(countries[cca2])
    })
  }

  onClose = () => {
    this.setState({
      modalVisible: false,
      filter: '',
      dataSource: ds.cloneWithRows([null, ...this.state.cca2List])
    })
    if (this.props.onClose) {
      this.props.onClose()
    }
  }

  onOpen = () => {
    this.setState({
      modalVisible: true
    })
    if (typeof this.props.onOpen === 'function') {
      this.props.onOpen()
    }
  }

  getCountryName(country, optionalTranslation) {
    const translation = optionalTranslation || this.props.translation || 'eng'
    return country.name[translation] || country.name.common
  }

  setVisibleListHeight(offset) {
    this.visibleListHeight = getHeightPercent(100) - offset
  }

  getLetters(list) {
    return Object.keys(
      list.reduce(
        (acc, val) => ({
          ...acc,
          [this.getCountryName(countries[val])
            .slice(0, 1)
            .toUpperCase()]: ''
        }),
        {}
      )
    ).sort()
  }


  // dimensions of country list and window
  itemHeight = getHeightPercent(7)
  listHeight = countries.length * this.itemHeight


  scrollTo(letter) {
    // find position of first country that starts with letter
    const index = this.state.cca2List
      .map(country => this.getCountryName(countries[country])[0])
      .indexOf(letter)
    if (index === -1) {
      return
    }
    let position = index * this.itemHeight

    // do not scroll past the end of the list
    if (position + this.visibleListHeight > this.listHeight) {
      position = this.listHeight - this.visibleListHeight
    }

    // scroll
    this._listView.scrollTo({
      y: position
    })
  }

  handleFilterChange = value => {
    const filteredCountries =
      value === '' ? [null, ...this.state.cca2List] : this.fuse.search(value)

    this._listView.scrollTo({ y: 0 })

    this.setState({
      filter: value,
      dataSource: ds.cloneWithRows(filteredCountries)
    })
  }

  renderCountry(country, index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => this.onSelectCountry(country)}
        activeOpacity={0.99}
      >
        {this.renderCountryDetail(country)}
      </TouchableOpacity>
    )
  }

  renderLetters(letter, index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => this.scrollTo(letter)}
        activeOpacity={0.6}
      >
        <View style={styles.letter}>
          <Text style={styles.letterText} allowFontScaling={false}>
            {letter}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  renderCountryDetail(cca2) {
    const country = countries[cca2]
    return (
      <View style={styles.itemCountry}>
        {CountryPicker.renderFlag(cca2)}
        <View style={styles.itemCountryName}>
          <Text style={styles.countryName} allowFontScaling={false}>
            {this.getCountryName(country)}
          </Text>
        </View>
      </View>
    )
  }

  renderEmptyChoice(index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => this.onSelectEmpty()}
        activeOpacity={0.99}
      >
        <View style={styles.itemCountry}>
          <View style={[styles.itemCountryFlag, {width: '5%'}]}>
          </View>
          <View style={[styles.itemCountryName, {width: '80%'}]}>
            <Text style={styles.countryName} allowFontScaling={false}>
              {this.props.emptyChoiceText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  renderFilter = () => {
    const {
      renderFilter,
      autoFocusFilter,
      filterPlaceholder,
      filterPlaceholderTextColor
    } = this.props

    const value = this.state.filter
    const onChange = this.handleFilterChange
    const onClose = this.onClose

    return renderFilter ? (
      renderFilter({ value, onChange, onClose })
    ) : (
      <TextInput
        autoFocus={autoFocusFilter}
        autoCorrect={false}
        placeholder={filterPlaceholder}
        placeholderTextColor={filterPlaceholderTextColor}
        style={[styles.input, !this.props.closeable && styles.inputOnly]}
        onChangeText={onChange}
        value={value}
      />
    )
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          disabled={this.props.disabled}
          onPress={this.onOpen}
          activeOpacity={0.7}
          style={styles.mainTouchable}
        >
          {this.props.children ? (
            this.props.children
          ) : (
            <View
              style={[styles.touchFlag, { marginTop: isEmojiable ? 0 : 5 }]}
            >
              {CountryPicker.renderFlag(this.props.cca2)}
            </View>
          )}
        </TouchableOpacity>
        <Modal
          transparent={this.props.transparent}
          animationType={this.props.animationType}
          visible={this.state.modalVisible}
          onRequestClose={this.onClose}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.header}>
              {this.props.closeable && (
                <CloseButton
                  image={this.props.closeButtonImage}
                  styles={[styles.closeButton, styles.closeButtonImage]}
                  onPress={() => this.onClose()}
                />
              )}
              {this.props.filterable && this.renderFilter()}
            </View>
            <KeyboardAvoidingView behavior="padding">
              <View style={styles.contentContainer}>
                <ListView
                  keyboardShouldPersistTaps="always"
                  enableEmptySections
                  ref={listView => (this._listView = listView)}
                  dataSource={this.state.dataSource}
                  renderRow={country => country ? this.renderCountry(country) : this.renderEmptyChoice()}
                  initialListSize={30}
                  pageSize={15}
                  onLayout={({ nativeEvent: { layout: { y: offset } } }) =>
                    this.setVisibleListHeight(offset)
                  }
                />
                {!this.props.hideAlphabetFilter && (
                  <ScrollView
                    contentContainerStyle={styles.letters}
                    keyboardShouldPersistTaps="always"
                  >
                    {this.state.filter === '' &&
                      this.state.letters.map((letter, index) =>
                        this.renderLetters(letter, index)
                      )}
                  </ScrollView>
                )}
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </View>
    )
  }
}
