// ==UserScript==
// @name         AiryTV
// @description  Watch videos in external player.
// @version      1.0.3
// @match        *://airy.tv/*
// @match        *://*.airy.tv/*
// @icon         https://airy.tv/wp-content/uploads/2020/11/playstore-icon.png
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-AiryTV/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-AiryTV/issues
// @downloadURL  https://github.com/warren-bank/crx-AiryTV/raw/webmonkey-userscript/es5/webmonkey-userscript/AiryTV.user.js
// @updateURL    https://github.com/warren-bank/crx-AiryTV/raw/webmonkey-userscript/es5/webmonkey-userscript/AiryTV.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

var strings = {
  "heading_controls":    "Download EPG Data",
  "button_refresh":      "Load/Refresh",

  "heading_filters":     "Filter Channels",
  "label_type":          "By Type:",
  "types": {
    "live_stream":       "Live Stream",
    "on_demand":         "On Demand"
  },
  "default_type":        "Show All",
  "label_name":          "By Name:",
  "button_filter":       "Apply",

  "heading_tools":       "Tools",
  "button_expand_all":   "Expand All",
  "button_collapse_all": "Collapse All",

  "button_start_video":  "Start Video",

  "episode_labels": {
    "title":             "title:",
    "summary":           "summary:",
    "time_start":        "starts at:",
    "time_stop":         "ends at:",
    "time_duration":     "duration:"
  },
  "episode_units": {
    "duration_hour":     "hour",
    "duration_hours":    "hours",
    "duration_minutes":  "minutes"
  }
}

var constants = {
  "debug":               false,
  "title":               "AiryTV",
  "target_url": {
    "pathname":          "/privacy-policy/"
  },
  "base_url": {
    "href":              "https://webapp.airy.tv/Live_Streams/"
  },
  "dom_ids": {
    "div_root":          "AiryTV_EPG",
    "div_controls":      "EPG_controls",
    "div_filters":       "EPG_filters",
    "div_tools":         "EPG_tools",
    "div_data":          "EPG_data",
    "select_type":       "channel_types",
    "text_query":        "channel_search_query"
  },
  "dom_classes": {
    "data_loaded":       "loaded",
    "toggle_collapsed":  "collapsible_state_closed",
    "toggle_expanded":   "collapsible_state_opened",
    "div_heading":       "heading",
    "div_toggle":        "toggle_collapsible",
    "div_collapsible":   "collapsible",
    "div_webcast_icons": "icons-container"
  },
  "img_urls": {
    "icon_expand":       "https://github.com/warren-bank/crx-AiryTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.arrow_drop_down_circle.twotone.png",
    "icon_collapse":     "https://github.com/warren-bank/crx-AiryTV/raw/webmonkey-userscript/es5/webmonkey-userscript/img/white.expand_less.round.png"
  }
}

// ----------------------------------------------------------------------------- helpers

// https://stackoverflow.com/a/8888498
var get_12_hour_time_string = function(date, hour_padding) {
  if (!(date instanceof Date)) date = new Date()
  var hours = date.getHours()
  var minutes = date.getMinutes()
  var ampm = (hours >= 12) ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'
  hours = (hour_padding && (hours < 10)) ? (hour_padding + hours) : hours
  minutes = (minutes < 10) ? ('0' + minutes) : minutes
  return hours + ':' + minutes + ' ' + ampm
}

// -----------------------------------------------------------------------------

var convert_ms_to_mins = function(X) {
  // (X ms)(1 sec / 1000 ms)(1 min / 60 sec)
  return Math.ceil(X / 60000)
}

var get_ms_duration_time_string = function(ms) {
  var time_string = ''
  var mins = convert_ms_to_mins(ms)
  var hours

  if (mins >= 60) {
    hours       = Math.floor(mins / 60)
    time_string = hours + ' ' + ((hours < 2) ? strings.episode_units.duration_hour : strings.episode_units.duration_hours) + ', '
    mins        = mins % 60
  }

  return time_string + mins + ' ' + strings.episode_units.duration_minutes
}

// -----------------------------------------------------------------------------

var make_element = function(elementName, innerContent, isText) {
  var el = unsafeWindow.document.createElement(elementName)

  if (innerContent) {
    if (isText)
      el.innerText = innerContent
    else
      el.innerHTML = innerContent
  }

  return el
}

var make_span = function(text) {return make_element('span', text)}
var make_h4   = function(text) {return make_element('h4',   text)}

// ----------------------------------------------------------------------------- DOM: static skeleton

var reinitialize_dom = function() {
  var head = unsafeWindow.document.getElementsByTagName('head')[0]
  var body = unsafeWindow.document.body

  var html = {
    "head": [
      '<style>',

      // --------------------------------------------------- CSS: global

      'body {',
      '  background-color: #fff;',
      '  text-align: center;',
      '}',

      // --------------------------------------------------- CSS: EPG controls

      '#EPG_controls {',
      '  display: inline-block;',
      '}',

      '#EPG_controls > div {',
      '  margin: 1.25em 0;',
      '}',
      '#EPG_controls > div:first-child {',
      '  margin-top: 0;',
      '}',
      '#EPG_controls > div:last-child {',
      '  margin-bottom: 0;',
      '}',

      '#EPG_controls > div > h4 {',
      '  margin: 0;',
      '}',

      '#EPG_controls > div > button {',
      '  display: inline-block;',
      '  margin: 0px;',
      '}',

      // --------------------------------------------------- CSS: EPG filters

      '#EPG_filters {',
      '}',

      '#EPG_filters > div {',
      '  margin: 1.25em 0;',
      '}',
      '#EPG_filters > div:first-child {',
      '  margin-top: 0;',
      '}',
      '#EPG_filters > div:last-child {',
      '  margin-bottom: 0;',
      '}',

      '#EPG_filters > div > h4 {',
      '  margin: 0;',
      '}',

      '#EPG_filters > div > input,',
      '#EPG_filters > div > select,',
      '#EPG_filters > div > button {',
      '  display: inline-block;',
      '  margin: 0px;',
      '}',

      '#EPG_filters > div > input,',
      '#EPG_filters > div > select {',
      '  margin-left: 0.75em;',
      '}',

      // --------------------------------------------------- CSS: EPG tools

      '#EPG_tools {',
      '}',

      '#EPG_tools > div {',
      '  margin: 1.25em 0;',
      '}',
      '#EPG_tools > div:first-child {',
      '  margin-top: 0;',
      '}',
      '#EPG_tools > div:last-child {',
      '  margin-bottom: 0;',
      '}',

      '#EPG_tools > div > h4 {',
      '  margin: 0;',
      '}',

      '#EPG_tools > div > button {',
      '  display: inline-block;',
      '  margin: 0px;',
      '}',
      '#EPG_tools > div > button + button {',
      '  margin-left: 1.25em;',
      '}',

      '#EPG_tools > div > button > * {',
      '  vertical-align: middle;',
      '}',
      '#EPG_tools > div > button > img {',
      '  display: inline-block;',
      '  background-color: #999;',
      '  margin-right: 0.5em;',
      '}',

      // --------------------------------------------------- CSS: EPG data

      '#EPG_data {',
      '  margin-top: 0.5em;',
      '  text-align: left;',
      '}',

      '#EPG_data > div {',
      '  border: 1px solid #333;',
      '}',

      '#EPG_data > div > div.heading {',
      '  position: relative;',
      '  z-index: 1;',
      '  overflow: hidden;',
      '}',

      '#EPG_data > div > div.heading > h2 {',
      '  display: block;',
      '  margin: 0;',
      '  margin-right: 94px;',
      '  background-color: #ccc;',
      '  padding: 0.25em;',
      '}',

      '#EPG_data > div > div.heading > div.toggle_collapsible {',
      '  display: block;',
      '  width: 94px;',
      '  background-color: #999;',
      '  position: absolute;',
      '  z-index: 1;',
      '  top: 0;',
      '  bottom: 0;',
      '  right: 0;',
      '  cursor: help;',
      '}',

      '#EPG_data > div > div.collapsible {',
      '  padding: 0.5em;',
      '}',

      '#EPG_data > div > div.collapsible ul {',
      '  list-style: none;',
      '  margin: 0;',
      '  padding: 0;',
      '  padding-left: 1em;',
      '}',

      '#EPG_data > div > div.collapsible ul > li {',
      '  list-style: none;',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #999;',
      '  padding-top: 0.5em;',
      '}',

      '#EPG_data > div > div.collapsible ul > li > table td:first-child {',
      '  font-style: italic;',
      '  padding-right: 1em;',
      '}',

      '#EPG_data > div > div.collapsible ul > li > blockquote {',
      '  display: block;',
      '  background-color: #eee;',
      '  padding: 0.5em 1em;',
      '  margin: 0;',
      '}',

      // --------------------------------------------------- CSS: EPG data (collapsible toggle state)

      '#EPG_data > div > div.heading > div.toggle_collapsible {',
      '  background-repeat: no-repeat;',
      '  background-position: center;',
      '}',

      '#EPG_data > div.collapsible_state_closed > div.heading > div.toggle_collapsible {',
      '  background-image: url("' + constants.img_urls.icon_expand + '");',
      '}',
      '#EPG_data > div.collapsible_state_closed > div.collapsible {',
      '  display: none;',
      '}',

      '#EPG_data > div.collapsible_state_opened > div.heading > div.toggle_collapsible {',
      '  background-image: url("' + constants.img_urls.icon_collapse + '");',
      '}',
      '#EPG_data > div.collapsible_state_opened > div.collapsible {',
      '  display: block;',
      '}',

      // --------------------------------------------------- CSS: EPG data (links to tools on Webcast Reloaded website)

      '#EPG_data > div > div.collapsible div.icons-container {',
      '  display: block;',
      '  position: relative;',
      '  z-index: 1;',
      '  float: right;',
      '  margin: 0.5em;',
      '  width: 60px;',
      '  height: 60px;',
      '  max-height: 60px;',
      '  vertical-align: top;',
      '  background-color: #d7ecf5;',
      '  border: 1px solid #000;',
      '  border-radius: 14px;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy > img,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link > img {',
      '  display: block;',
      '  width: 25px;',
      '  height: 25px;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  position: absolute;',
      '  z-index: 1;',
      '  text-decoration: none;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay {',
      '  top: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  bottom: 0;',
      '}',

      '#EPG_data > div > div.collapsible div.icons-container > a.chromecast,',
      '#EPG_data > div > div.collapsible div.icons-container > a.proxy {',
      '  left: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay,',
      '#EPG_data > div > div.collapsible div.icons-container > a.video-link {',
      '  right: 0;',
      '}',
      '#EPG_data > div > div.collapsible div.icons-container > a.airplay + a.video-link {',
      '  right: 17px; /* (60 - 25)/2 to center when there is no proxy icon */',
      '}',

      // --------------------------------------------------- CSS: EPG data (live stream)

      '#EPG_data > div[x-channel-type="live_stream"] > div.heading > h2 {',
      '  color: blue;',
      '  cursor: pointer;',
      '}',

      // --------------------------------------------------- CSS: EPG data (on demand)

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible ul > li > table {',
      '  min-height: 70px;',
      '}',

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible ul > li > button {',
      '  margin: 0.75em 0;',
      '}',

      '#EPG_data > div[x-channel-type="on_demand"] > div.collapsible ul > li > div.icons-container {',
      '}',

      // --------------------------------------------------- CSS: separation between EPG sections

      '#AiryTV_EPG > #EPG_filters,',
      '#AiryTV_EPG > #EPG_tools,',
      '#AiryTV_EPG > #EPG_data {',
      '  display: none;',
      '}',

      '#AiryTV_EPG.loaded > #EPG_filters,',
      '#AiryTV_EPG.loaded > #EPG_tools,',
      '#AiryTV_EPG.loaded > #EPG_data {',
      '  display: block;',
      '  margin-top: 0.5em;',
      '  border-top: 1px solid #333;',
      '  padding-top: 0.5em;',
      '}',

      '</style>'
    ],
    "body": [
      '<div id="AiryTV_EPG">',
      '  <div id="EPG_controls"></div>',
      '  <div id="EPG_filters"></div>',
      '  <div id="EPG_tools"></div>',
      '  <div id="EPG_data"></div>',
      '</div>'
    ]
  }

  head.innerHTML = '' + html.head.join("\n")
  body.innerHTML = '' + html.body.join("\n")

  unsafeWindow.document.title = constants.title
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - controls

var make_refresh_button = function() {
  var button = make_element('button', strings.button_refresh)
  button.addEventListener("click", fetch_epg_data)
  return button
}

var populate_dom_controls = function() {
  var refresh_button      = make_refresh_button()
  var EPG_controls        = unsafeWindow.document.getElementById(constants.dom_ids.div_controls)
  var div

  EPG_controls.innerHTML  = ''

  div = make_element('div')
  div.appendChild(make_h4(strings.heading_controls))
  EPG_controls.appendChild(div)

  div = make_element('div')
  div.appendChild(refresh_button)
  EPG_controls.appendChild(div)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - filters

var active_filters = {
  "type":       "",
  "text_query": ""
}

var process_filters = function(type, text_query) {
  if ((active_filters.type === type) && (active_filters.text_query === text_query)) return

  active_filters.type       = type
  active_filters.text_query = text_query

  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)
  var channel_divs = EPG_data.childNodes
  var channel_div, is_visible, channel_type, channel_name

  for (var i=0; i < channel_divs.length; i++) {
    channel_div = channel_divs[i]

    if (channel_div && (channel_div instanceof HTMLElement) && (channel_div.nodeName === 'DIV')) {
      is_visible = true

      if (is_visible && type) {
        channel_type = channel_div.getAttribute('x-channel-type')

        if (channel_type !== type)
          is_visible = false
      }

      if (is_visible && text_query) {
        channel_name = channel_div.getAttribute('x-channel-name')

        if (channel_name.indexOf(text_query) === -1)
          is_visible = false
      }

      channel_div.style.display = is_visible ? 'block' : 'none'
    }
  }
}

var onclick_filter_button = function() {
  var type       = unsafeWindow.document.getElementById(constants.dom_ids.select_type).value
  var text_query = unsafeWindow.document.getElementById(constants.dom_ids.text_query).value.toLowerCase()

  process_filters(type, text_query)
}

var make_filter_button = function() {
  var button = make_element('button')

  button.innerHTML = strings.button_filter
  button.addEventListener("click", onclick_filter_button)

  return button
}

var make_type_select_element = function() {
  var select = make_element('select')
  select.setAttribute('id', constants.dom_ids.select_type)
  return select
}

var make_text_query_input_element = function() {
  var input = make_element('input')
  input.setAttribute('id', constants.dom_ids.text_query)
  input.setAttribute('type', 'text')
  return input
}

var populate_type_select_filter = function() {
  var select = unsafeWindow.document.getElementById(constants.dom_ids.select_type)
  var option, keys, value, name

  select.innerHTML = ''

  option = make_element('option')
  option.setAttribute('selected', 'selected')
  option.setAttribute('value', '')
  option.innerHTML = strings.default_type
  select.appendChild(option)

  keys = Object.keys(strings.types)
  if (!keys || !Array.isArray(keys) || !keys.length) return

  for (var i=0; i < keys.length; i++) {
    value = keys[i]
    name  = strings.types[value]

    if (value && name) {
      option = make_element('option')
      option.setAttribute('value', value)
      option.innerHTML = name
      select.appendChild(option)
    }
  }
}

var populate_dom_filters = function() {
  var select_type     = make_type_select_element()
  var text_query      = make_text_query_input_element()
  var filter_button   = make_filter_button()
  var EPG_filters     = unsafeWindow.document.getElementById(constants.dom_ids.div_filters)
  var div

  EPG_filters.innerHTML  = ''

  div = make_element('div')
  div.appendChild(make_h4(strings.heading_filters))
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(make_span(strings.label_type))
  div.appendChild(select_type)
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(make_span(strings.label_name))
  div.appendChild(text_query)
  EPG_filters.appendChild(div)

  div = make_element('div')
  div.appendChild(filter_button)
  EPG_filters.appendChild(div)

  populate_type_select_filter()
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - tools

var process_expand_or_collapse_all_button = function(expand, exclude_filtered_channels) {
  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)
  var channel_divs = EPG_data.childNodes
  var channel_div, is_expanded, is_filtered_channel

  for (var i=0; i < channel_divs.length; i++) {
    channel_div = channel_divs[i]
    is_expanded = channel_div.classList.contains(constants.dom_classes.toggle_expanded)

    // short-circuit if nothing to do
    if (is_expanded == expand) continue

    if (exclude_filtered_channels) {
      is_filtered_channel = (channel_div.style.display === 'none')

      // short-circuit if filtered/nonvisible channels are excluded
      if (is_filtered_channel) continue
    }

    channel_div.className = (expand)
      ? constants.dom_classes.toggle_expanded
      : constants.dom_classes.toggle_collapsed
  }
}

var onclick_expand_all_button = function() {
  process_expand_or_collapse_all_button(true, false)
}

var onclick_collapse_all_button = function() {
  process_expand_or_collapse_all_button(false, false)
}

var make_expand_all_button = function() {
  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_expand + '" /> ' + strings.button_expand_all
  button.addEventListener("click", onclick_expand_all_button)

  return button
}

var make_collapse_all_button = function() {
  var button = make_element('button')

  button.innerHTML = '<img src="' + constants.img_urls.icon_collapse + '" /> ' + strings.button_collapse_all
  button.addEventListener("click", onclick_collapse_all_button)

  return button
}

var populate_dom_tools = function() {
  var expand_all_button   = make_expand_all_button()
  var collapse_all_button = make_collapse_all_button()
  var EPG_tools           = unsafeWindow.document.getElementById(constants.dom_ids.div_tools)
  var div

  EPG_tools.innerHTML  = ''

  div = make_element('div')
  div.appendChild(make_h4(strings.heading_tools))
  EPG_tools.appendChild(div)

  div = make_element('div')
  div.appendChild(expand_all_button)
  div.appendChild(collapse_all_button)
  EPG_tools.appendChild(div)
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     = encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url ? encodeURIComponent(encodeURIComponent(btoa(vtt_url))) : null
  referer_url           = referer_url ? referer_url : constants.base_url.href
  encoded_referer_url   = encodeURIComponent(encodeURIComponent(btoa(referer_url)))

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + '/referer/' + encoded_referer_url
  return webcast_reloaded_url
}

var get_webcast_reloaded_url_chromecast_sender = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ null, /* force_https= */ null).replace('/index.html', '/chromecast_sender.html')
}

var get_webcast_reloaded_url_airplay_sender = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/airplay_sender.es5.html')
}

var get_webcast_reloaded_url_proxy = function(video_url, vtt_url, referer_url) {
  return get_webcast_reloaded_url(video_url, vtt_url, referer_url, /* force_http= */ true, /* force_https= */ false).replace('/index.html', '/proxy.html')
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if ((url[0] === '/') && (typeof GM_resolveUrl === 'function'))
      url = GM_resolveUrl(url, unsafeWindow.location.href)
    if (url.indexOf('http') === 0)
      GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = constants.base_url.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    return true
  }
  else if (user_options.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

var process_mp4_url = function(mp4_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ mp4_url, /* video_type= */ 'video/mp4', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- DOM: dynamic elements - EPG data

var onclick_start_video = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=true;

  var node        = event.target
  var video_url   = node.getAttribute('x-video-url')
  var video_type  = node.getAttribute('x-video-type')
  var vtt_url     = node.getAttribute('x-vtt-url')
  var referer_url = node.getAttribute('x-referer-url')

  if (video_url)
    process_video_url(video_url, video_type, vtt_url, referer_url)
}

var onclick_channel_toggle = function(event) {
  event.stopPropagation();event.stopImmediatePropagation();event.preventDefault();event.returnValue=true;

  var toggle_div = event.target
  if (!toggle_div || !(toggle_div instanceof HTMLElement)) return

  var channel_div = toggle_div.parentNode.parentNode
  if (!channel_div || !(channel_div instanceof HTMLElement)) return

  channel_div.className = (channel_div.classList.contains(constants.dom_classes.toggle_expanded))
    ? constants.dom_classes.toggle_collapsed
    : constants.dom_classes.toggle_expanded
}

var make_episode_listitem_html = function(referer_url, type, data) {
  var dates = {
    obj: {},
    str: {}
  }

  var temp

  if (data.start) {
    temp            = new Date(data.start)
    dates.obj.start = temp
    dates.str.start = temp.toLocaleDateString() + ' ' + get_12_hour_time_string(temp, '&nbsp;')
  }

  if (data.stop) {
    temp           = new Date(data.stop)
    dates.obj.stop = temp
    dates.str.stop = temp.toLocaleDateString() + ' ' + get_12_hour_time_string(temp, '&nbsp;')
  }

  if (data.duration) {
    dates.str.duration = get_ms_duration_time_string(data.duration)
  }

  var tr = []

  var append_tr = function(td, colspan) {
    if (Array.isArray(td))
      tr.push('<tr><td>' + td.join('</td><td>') + '</td></tr>')
    else if ((typeof colspan === 'number') && (colspan > 1))
      tr.push('<tr><td colspan="' + colspan + '">' + td + '</td></tr>')
    else
      tr.push('<tr><td>' + td + '</td></tr>')
  }

  if (data.title)
    append_tr([strings.episode_labels.title, data.title])
  if (dates.str.start)
    append_tr([strings.episode_labels.time_start, dates.str.start])
  if (dates.str.stop)
    append_tr([strings.episode_labels.time_stop, dates.str.stop])
  if (dates.str.duration)
    append_tr([strings.episode_labels.time_duration, dates.str.duration])
  if (data.description)
    append_tr(strings.episode_labels.summary, 2)

  var html = [
    '<table>' + tr.join("\n") + '</table>'
  ]

  if (data.description) {
    html.push(
      '<blockquote>' + data.description + '</blockquote>'
    )
  }

  if ((type === 'on_demand') && (data.mp4_url)) {
    html.push(
      '<button x-video-url="' + data.mp4_url + '" x-video-type="video/mp4" x-referer-url="' + referer_url + '">' + strings.button_start_video + '</button>'
    )
  }

  return '<li>' + html.join("\n") + '</li>'
}

var make_webcast_reloaded_div = function(video_url, referer_url, exclude_proxy) {
  var webcast_reloaded_urls = {
    "icons_basepath":    'https://github.com/warren-bank/crx-webcast-reloaded/raw/gh-pages/chrome_extension/2-release/popup/img/',
//  "index":             get_webcast_reloaded_url(                  video_url, /* vtt_url= */ null, referer_url),
    "chromecast_sender": get_webcast_reloaded_url_chromecast_sender(video_url, /* vtt_url= */ null, referer_url),
    "airplay_sender":    get_webcast_reloaded_url_airplay_sender(   video_url, /* vtt_url= */ null, referer_url),
    "proxy":             get_webcast_reloaded_url_proxy(            video_url, /* vtt_url= */ null, referer_url)
  }

  var div = make_element('div')

  var html = [
    '<a target="_blank" class="chromecast" href="' + webcast_reloaded_urls.chromecast_sender + '" title="Chromecast Sender"><img src="'       + webcast_reloaded_urls.icons_basepath + 'chromecast.png"></a>',
    '<a target="_blank" class="airplay" href="'    + webcast_reloaded_urls.airplay_sender    + '" title="ExoAirPlayer Sender"><img src="'     + webcast_reloaded_urls.icons_basepath + 'airplay.png"></a>',
    '<a target="_blank" class="proxy" href="'      + webcast_reloaded_urls.proxy             + '" title="HLS-Proxy Configuration"><img src="' + webcast_reloaded_urls.icons_basepath + 'proxy.png"></a>',
    '<a target="_blank" class="video-link" href="' + video_url                               + '" title="direct link to video"><img src="'    + webcast_reloaded_urls.icons_basepath + 'video_link.png"></a>'
  ]

  if (exclude_proxy)
    delete html[2]

  div.setAttribute('class', constants.dom_classes.div_webcast_icons)
  div.innerHTML = html.join("\n")

  return div
}

var insert_webcast_reloaded_div = function(webcast_reloaded_div_parent, video_url, referer_url, exclude_proxy) {
  var webcast_reloaded_div = make_webcast_reloaded_div(video_url, referer_url, exclude_proxy)

  if (webcast_reloaded_div_parent.childNodes.length)
    webcast_reloaded_div_parent.insertBefore(webcast_reloaded_div, webcast_reloaded_div_parent.childNodes[0])
  else
    webcast_reloaded_div_parent.appendChild(webcast_reloaded_div)
}

var make_channel_div = function(type, data) {
  var referer_url  = 'https://webapp.airy.tv/Live_Streams/' + data.channel.slug
  var episodes_map = make_episode_listitem_html.bind(null, referer_url, type)
  var html, div, webcast_reloaded_div_parent
  var list_items, item, item_button

  switch(type) {
    case 'live_stream':
      if (Array.isArray(data.episodes) && data.episodes.length) {
        html = [
          '<div class="' + constants.dom_classes.div_heading + '">',
          '  <h2 x-video-url="' + data.channel.hls_url + '" x-video-type="application/x-mpegurl" x-referer-url="' + referer_url + '">' + data.channel.name + '</h2>',
          '  <div class="' + constants.dom_classes.div_toggle + '"></div>',
          '</div>',
          '<div class="' + constants.dom_classes.div_collapsible + '">',
          '  <ul>' + data.episodes.map(episodes_map).join("\n") + '</ul>',
          '</div>'
        ]
      }
      else {
        html = [
          '<div class="' + constants.dom_classes.div_heading + '">',
          '  <h2 x-video-url="' + data.channel.hls_url + '" x-video-type="application/x-mpegurl" x-referer-url="' + referer_url + '">' + data.channel.name + '</h2>',
          '</div>'
        ]
      }
      break
    case 'on_demand':
      if (Array.isArray(data.episodes) && data.episodes.length) {
        html = [
          '<div class="' + constants.dom_classes.div_heading + '">',
          '  <h2>' + data.channel.name + '</h2>',
          '  <div class="' + constants.dom_classes.div_toggle + '"></div>',
          '</div>',
          '<div class="' + constants.dom_classes.div_collapsible + '">',
          '  <ul>' + data.episodes.map(episodes_map).join("\n") + '</ul>',
          '</div>'
        ]
      }
      break
    default:
      break
  }

  if (!html)
    return null

  div = make_element('div', html.join("\n"))

  div.setAttribute('class',          constants.dom_classes.toggle_collapsed)
  div.setAttribute('x-channel-type', type)
  div.setAttribute('x-channel-name', data.channel.name.toLowerCase())

  div.querySelector(':scope > div.' + constants.dom_classes.div_heading + ' > div.' + constants.dom_classes.div_toggle).addEventListener("click", onclick_channel_toggle)

  if (type === 'live_stream') {
    div.querySelector(':scope > div.' + constants.dom_classes.div_heading + ' > h2[x-video-url]').addEventListener("click", onclick_start_video)

    webcast_reloaded_div_parent = div.querySelector(':scope > div.' + constants.dom_classes.div_collapsible)

    insert_webcast_reloaded_div(webcast_reloaded_div_parent, data.channel.hls_url, referer_url)
  }

  if (type === 'on_demand') {
    list_items = div.querySelectorAll(':scope > div.' + constants.dom_classes.div_collapsible + ' > ul > li')

    for (var i=0; i < list_items.length; i++) {
      item        = list_items[i]
      item_button = item.querySelector(':scope > button[x-video-url]')

      item_button.addEventListener("click", onclick_start_video)

      insert_webcast_reloaded_div(item, item_button.getAttribute('x-video-url'), referer_url, true)
    }
  }

  return div
}

var process_epg_data = function(data) {
  var EPG_root = unsafeWindow.document.getElementById(constants.dom_ids.div_root)
  var EPG_data = unsafeWindow.document.getElementById(constants.dom_ids.div_data)

  EPG_root.className = ''
  EPG_data.innerHTML = ''

  if ((typeof data !== 'object') || (data === null))
    return

  var channel_types = Object.keys(data)

  var channel_type, channel_list, channel_data, div

  for (var i1=0; i1 < channel_types.length; i1++) {
    channel_type = channel_types[i1]
    channel_list  = data[channel_type]

    if (!Array.isArray(channel_list) || !channel_list.length)
      continue

    for (var i2=0; i2 < channel_list.length; i2++) {
      channel_data = channel_list[i2]

      if ((typeof channel_data !== 'object') || (channel_data === null))
        continue

      div = make_channel_div(channel_type, channel_data)
      if (div)
        EPG_data.appendChild(div)
    }
  }

  EPG_root.className = constants.dom_classes.data_loaded
}

var preprocess_epg_data = function(raw_data) {
  var channels, category, channel, episode
  var slug, name, hls_url, title, description, duration, start, stop, mp4_url
  var hashmap_unique_values, reset_filter, filter_by_unique_id, sort_by_type_then_name, filter_by_unique_mp4_url, sort_by_title
  var preprocessed_channel

  var preprocessed_data = {
    "live_stream": [],    // {channel: {slug, name, hls_url}, episodes: [{title, description, duration, start, stop}]}
    "on_demand":   []     // {channel: {slug, name         }, episodes: [{title, description, duration, mp4_url}]}
  }

  if (
       (typeof raw_data !== 'object') || (raw_data === null)
    || (raw_data.status !== 'success')
    || (typeof raw_data.response !== 'object') || (raw_data.response === null)
    || !Array.isArray(raw_data.response.categories) || !raw_data.response.categories.length
  ) {
    return preprocessed_data
  }

  channels = []

  for (var i1=0; i1 < raw_data.response.categories.length; i1++) {
    category = raw_data.response.categories[i1]

    if ((typeof category !== 'object') || (category === null))
      continue

    if (Array.isArray(category.channels) && category.channels.length)
      channels = channels.concat(category.channels)
    if (Array.isArray(category.stream_channels) && category.stream_channels.length)
      channels = channels.concat(category.stream_channels)
  }

  reset_filter = function() {
    hashmap_unique_values = {}
  }

  filter_by_unique_id = function(channel) {
    if (!channel.id)
      return false

    if (hashmap_unique_values[channel.id])
      return false

    hashmap_unique_values[channel.id] = true
    return true
  }

  sort_by_type_then_name = function(c1, c2) {
    if (c1.hls !== c2.hls) {
      return c1.hls ? -1 : 1
    }

    var c1n, c2n
    c1n = c1.name.toLowerCase()
    c2n = c2.name.toLowerCase()

    return (c1n < c2n)
      ? -1
      : (c1n > c2n)
        ? 1
        : 0
  }

  filter_by_unique_mp4_url = function(episode) {
    if (!episode.mp4_url)
      return false

    if (hashmap_unique_values[episode.mp4_url])
      return false

    hashmap_unique_values[episode.mp4_url] = true
    return true
  }

  sort_by_title = function(e1, e2) {
    var e1t, e2t
    e1t = e1.title.toLowerCase()
    e2t = e2.title.toLowerCase()

    return (e1t < e2t)
      ? -1
      : (e1t > e2t)
        ? 1
        : 0
  }

  reset_filter()
  channels = channels.filter(filter_by_unique_id)
  channels = channels.sort(sort_by_type_then_name)

  for (var i2=0; i2 < channels.length; i2++) {
    channel = channels[i2]

    if (
         (typeof channel !== 'object') || (channel === null)
      || !channel.number || !channel.name
      || (channel.hls && !channel.source_url)
    ) {
      continue
    }

    slug = channel.number + '_' + channel.name
    name = channel.name.replace(/[_]+/g, ' ')

    if (channel.hls) {
      preprocessed_channel = {
        channel: {
          slug:    slug,
          name:    name,
          hls_url: channel.source_url
        },
        episodes: []
      }

      if (Array.isArray(channel.broadcasts) && channel.broadcasts.length) {
        for (var i3=0; i3 < channel.broadcasts.length; i3++) {
          episode = channel.broadcasts[i3]

          if ((typeof episode !== 'object') || (episode === null))
            continue

          if (!episode.title || !episode.stream_start_at_iso || !episode.stream_duration)
            continue

          title       = episode.title
          description = episode.description || ''
          duration    = episode.stream_duration * 1000
          start       = new Date(episode.stream_start_at_iso)
          stop        = start.getTime() + duration
          stop        = new Date(stop)

          if (description === title)
            description = ''

          preprocessed_channel.episodes.push({
            title:       title,
            description: description,
            duration:    duration,
            start:       start,
            stop:        stop
          })
        }
      }

      preprocessed_data.live_stream.push(preprocessed_channel)
    }
    else {
      preprocessed_channel = {
        channel: {
          slug: slug,
          name: name
        },
        episodes: []
      }

      if (Array.isArray(channel.broadcasts) && channel.broadcasts.length) {

        reset_filter()
        channel.broadcasts = channel.broadcasts.filter(filter_by_unique_id)
      //channel.broadcasts = channel.broadcasts.sort(sort_by_title)

        for (var i3=0; i3 < channel.broadcasts.length; i3++) {
          episode = channel.broadcasts[i3]

          if ((typeof episode !== 'object') || (episode === null))
            continue

          if (!episode.title || !Array.isArray(episode.parts) || !episode.parts.length)
            continue

          title       = episode.title
          description = episode.description || ''
          duration    = 0
          mp4_url     = null

          if (description === title)
            description = ''

          for (var i4=0; i4 < episode.parts.length; i4++) {
            episode = episode.parts[i4]

            if ((typeof episode !== 'object') || (episode === null))
              continue

            if (!episode.duration || !episode.source_url)
              continue

            duration = episode.duration * 1000
            mp4_url  = episode.source_url

            preprocessed_channel.episodes.push({
              title:       title,
              description: description,
              duration:    duration,
              mp4_url:     mp4_url
            })

            break
          }
        }
      }

      if (preprocessed_channel.episodes.length) {
        reset_filter()
        preprocessed_channel.episodes = preprocessed_channel.episodes.filter(filter_by_unique_mp4_url)
        preprocessed_channel.episodes = preprocessed_channel.episodes.sort(sort_by_title)

        preprocessed_data.on_demand.push(preprocessed_channel)
      }
    }
  }

  return preprocessed_data
}

// ----------------------------------------------------------------------------- EPG: download data

var fetch_epg_data = function() {
  var epg_url = 'https://api.airy.tv/api/v2.1.7/channels'

  var xhr = new unsafeWindow.XMLHttpRequest()
  xhr.open("GET", epg_url, true, null, null)
  xhr.onload = function(e) {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var epg_data
          epg_data = JSON.parse(xhr.responseText)
          epg_data = preprocess_epg_data(epg_data)

          process_epg_data(epg_data)
        }
        catch(error) {}
      }
    }
  }
  xhr.send()
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if (('function' === (typeof GM_getUrl)) && (GM_getUrl() !== unsafeWindow.location.href)) return

  var pathname = unsafeWindow.location.pathname

  if (pathname.indexOf(constants.target_url.pathname) === 0) {
    reinitialize_dom()
    populate_dom_controls()
    populate_dom_filters()
    populate_dom_tools()
  }
  else {
    redirect_to_url(constants.target_url.pathname)
  }
}

init()

// -----------------------------------------------------------------------------
