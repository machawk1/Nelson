/* global chrome, $, Timemap, moment, tmData */

var MAX_MEMENTOS_IN_DROPDOWN = 500

function createShadowDOM (cb) {
  const selector = '#minkuiX'

  let shadow = document.querySelector('#minkWrapper').attachShadow({ mode: 'open' })
  const template = document.querySelector(selector)
  shadow.appendChild(template)

  if (cb) {
    cb()
  }
}

function setupDrilldownInteractions () {
  setupDrilldownInteractionYear()
}

function appendHTMLToShadowDOM () {
  $.ajax(chrome.extension.getURL('minkui.html'))
    .done(function (data) {
    // TODO: before invoking any further, check to verify that some mementos exist (the aggregator query has returned).

      $('body').append(data)
      setupUI()

      let mementos
      if (tmData && tmData.mementos) {
        mementos = tmData.mementos.list // e.g. mementos[15].uri and mementos[15].datetime
      } else {
        mementos = []
      }

      chrome.storage.local.get('timemaps', function (items) {
        let cb = function () {
          createShadowDOM(setupDrilldownInteractions)
        }
        let mCount = mementos.length

        if (items.timemaps && items.timemaps[document.URL] && items.timemaps[document.URL].mementos && items.timemaps[document.URL].datetime) {
          mCount = items.timemaps[document.URL].mementos.length

          $('.dropdown').addClass('hidden')
          $('#drilldownBox').addClass('hidden')
          $('#steps').addClass('hidden')
          $('#title_dropdown').addClass('hidden')
          $('#archiveNow').addClass('hidden')
          $('#viewingMementoInterface').removeClass('hidden')

          $('#mementosAvailable').html('Viewing memento at ' + (new Date(items.timemaps[document.URL].datetime)))

          const firstButton = $('#memento_first')
          const lastButton = $('#memento_last')
          const prevButton = $('#memento_prev')
          const nextButton = $('#memento_next')

          items.timemaps[document.URL].mementos.forEach(function (mem) {
            let targetButton
            if (mem.first === true) {
              targetButton = firstButton
            }
            if (mem.last === true) {
              targetButton = lastButton
            }
            if (mem.next === true) {
              targetButton = nextButton
            }
            if (mem.prev === true) {
              targetButton = prevButton
            }

            if (typeof targetButton !== 'undefined') {
              if (mem.uri === window.document.URL) {
                targetButton.addClass('viewingMemento')
              }

              targetButton.removeAttr('disabled')
              targetButton.attr('data-uri', mem.uri)
            }
          })

          cb = createShadowDOM
        } else if (mCount > MAX_MEMENTOS_IN_DROPDOWN) {
          $('.dropdown').addClass('hidden')
          $('#steps .action').removeClass('active')
          $('#title_drilldown').addClass('active')
          buildDropDown([])

          let cleanedURIR = document.URL
          // Strip URI-Rs with hashes if necessary
          if (!items.timemaps.hasOwnProperty(document.URL)) {
            cleanedURIR = document.URL.replace(/#.*$/, '')
          }

          buildDrilldownYear(items.timemaps[cleanedURIR].mementos.list)
        } else if (mCount === 0) {
          switchToArchiveNowInterface()
        } else {
          buildDropDown(mementos)
          buildDrilldownYear(mementos)
          $('#drilldownBox').addClass('hidden')
          $('#steps .action').removeClass('active')
          $('#title_dropdown').addClass('active')
        }

        // Append CSS1
        let mementoPlurality = 'mementos'
        $('#mementosAvailable span#mementoCount').html(mCount.toLocaleString())
        if (mCount === 1) {
          mementoPlurality = 'memento'
        }
        $('#mementosAvailable span#mementoPlurality').html(mementoPlurality)

        // Append CSS2
        appendCSSToShadowDOM(cb)
      })
    })
}

function addZ (n) {
  return n < 10 ? '0' + n : '' + n
}

function buildDropDown (mementos) {
  let mementoSelections = ''
  for (let mm = 0; mm < mementos.length; mm++) {
    mementoSelections += '<option data-uri="' + mementos[mm].uri + '" data-datetime="' + mementos[mm].datetime + '">' + (new Date(mementos[mm].datetime)) + '</option>'
  }

  let mementoDropdown = $('#mementosDropdown')
  mementoDropdown.attr('data-memento-count', mementos.length)
  if (mementos.length === 0) {
    $('#title_dropdown').addClass('disabled')
  }
  mementoDropdown.append(mementoSelections)
}

function switchToArchiveNowInterface () {
  $('#mementosDropdown').addClass('noMementos')
  $('#drilldownBox').addClass('noMementos')
  $('#viewMementoButton').addClass('noMementos')
  $('#minkStatus #steps').addClass('noMementos')

  $('#archiveNow').addClass('noMementos')
  $('#archiveNowInterface').removeClass('hidden')
  $('.hideInNoMementosInterface').addClass('hidden')
}

function appendCSSToShadowDOM (cb) {
  $.ajax(chrome.extension.getURL('css/minkui.css'))
    .done(function (data) {
      const styleElement = '<style type="text/css">\n' + data + '\n</style>\n'
      $('#minkuiX').prepend(styleElement)
      cb()
    })
}

function randomEmail () { // eslint-disable-line no-unused-vars
  // Create random-generating function
  const randy = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  // Choices for the email character pool
  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  const choices = 'abcdefghijklmnopqrstuvwxyz' + '0123456789'
  const domain = ['.com', '.org', '.edu', '.co.uk', '.net'][randy(0, 4)]

  let text = ''

  // Have a function that will make a unique part of an
  // Email 1 to 3 characters long
  const getPart = function (pool) {
    const len = randy(1, 3)
    let it = ''
    for (let i = 0; i < len; ++i) {
      it += pool.charAt(randy(0, pool.length - 1))
    }
    return it
  }

  let len = randy(2, 4)
  // Get user portion of email
  for (let i = 0; i < len; ++i) {
    text += getPart(choices)
  }

  text += '@'

  len = randy(2, 3)
  // Get email host
  for (let i = 0; i < len; ++i) {
    text += getPart(alpha)
  }

  // Append the domain
  text += domain

  return text
}

function archiveURI (img, archiveid, openInNewTab) {
  chrome.runtime.sendMessage({
    method: 'archive',
    archive: archiveid,
    urir: document.URL,
    imgId: img.id,
    imgURI: img.uri,
    newTab: openInNewTab
  })
}

/* Vars in this namespace get "already declared" error when injected, hence var instead of let */
var years = {}
var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
var dayNames = ['NA', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
  '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
  '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th', '30th', '31st']

function buildDrilldownYear (mementos) {
  // NOTE: Shadow DOM not yet built. Do so after this function
  years = null
  years = {}

  $(mementos).each(function (mI, m) {
    const dt = moment(m.datetime)
    if (!years[dt.year()]) { years[dt.year()] = [] }
    years[dt.year()].push(m)
  })

  let memCountList = '<ul id="years">'
  for (let year in years) {
    memCountList += `<li data-year="${year}">${year}<span class="memCount">${years[year].length}</span></li>\r\n`
  }

  memCountList += '</ul>'

  $('body #drilldownBox').append(memCountList)
}

function setupDrilldownInteractionYear () {
  const shadow = document.getElementById('minkWrapper').shadowRoot

  // No stored TM, halt building irrelevant drilldown
  if (!shadow.getElementById('years')) { return }

  let yearsDOM = shadow.getElementById('years').childNodes

  for (let year = 0; year < yearsDOM.length; year++) {
    yearsDOM[year].onclick = function (event) {
      const existingMonthsUL = shadow.getElementById('months')
      const existingDaysUL = shadow.getElementById('days')
      const existingTimesUL = shadow.getElementById('times')
      const drilldownShadow = shadow.getElementById('drilldownBox')

      if (existingMonthsUL) {
        drilldownShadow.removeChild(existingMonthsUL)
      }

      if (existingDaysUL) {
        drilldownShadow.removeChild(existingDaysUL)
      }

      if (existingTimesUL) {
        drilldownShadow.removeChild(existingTimesUL)
      }

      buildDrilldownMonth($(this).data('year'))
      $(this).siblings().removeClass('selectedOption')
      $(this).addClass('selectedOption')
    }
  }
}

function buildDrilldownMonth (year) {
  let mementos = tmData.mementos.list

  let monthUL = document.createElement('ul')
  monthUL.id = 'months'

  let months = {}

  for (let memento in mementos) {
    const datetime = moment(mementos[memento].datetime)
    if (datetime.year() !== year) {
      continue
    }

    const monthName = monthNames[datetime.month()]
    if (!months[monthName]) {
      months[monthName] = []
    }
    months[monthName].push(year[memento])
  }

  for (let month in months) {
    let li = document.createElement('li')
    li.setAttribute('data-month', month)
    li.setAttribute('data-year', year)
    li.appendChild(document.createTextNode(month))

    let liSpan = document.createElement('span')
    liSpan.className = 'memCount'
    liSpan.appendChild(document.createTextNode(months[month].length))

    li.appendChild(liSpan)
    li.onclick = function (event) {
      buildDrilldownDay($(this).data('year'), $(this).data('month'))
      $(this).siblings().removeClass('selectedOption')
      $(this).addClass('selectedOption')
    }

    monthUL.appendChild(li)
  }

  const shadow = document.getElementById('minkWrapper').shadowRoot

  const existingMonthsUL = shadow.getElementById('months')
  const existingDaysUL = shadow.getElementById('days')
  const existingTimesUL = shadow.getElementById('times')
  const drilldownShadow = shadow.getElementById('drilldownBox')

  if (existingMonthsUL) {
    drilldownShadow.removeChild(existingMonthsUL)
  }

  if (existingDaysUL) {
    drilldownShadow.removeChild(existingDaysUL)
  }

  if (existingTimesUL) {
    drilldownShadow.removeChild(existingTimesUL)
  }

  drilldownShadow.appendChild(monthUL)
}

function buildDrilldownDay (year, month) {
  const mementos = tmData.mementos.list

  let dayUL = document.createElement('ul')
  dayUL.id = 'days'

  let days = {}

  for (let memento in mementos) {
    let datetime = moment(mementos[memento].datetime)

    if (datetime.year() !== year || monthNames[datetime.month()] !== month) {
      continue
    }

    const dayName = dayNames[datetime.date()]
    if (!days[dayName]) {
      days[dayName] = []
    }
    days[dayName].push(mementos[memento])
  }

  for (let day in days) {
    let li = document.createElement('li')
    li.setAttribute('data-date', day)
    li.setAttribute('data-month', month)
    li.setAttribute('data-year', year)
    li.appendChild(document.createTextNode(day))

    let liSpan = document.createElement('span')
    liSpan.className = 'memCount'
    liSpan.appendChild(document.createTextNode(days[day].length))

    li.appendChild(liSpan)
    li.onclick = function (event) {
      buildDrilldownTime($(this).data('year'), $(this).data('month'), parseInt($(this).data('date'), 10))
      $(this).siblings().removeClass('selectedOption')
      $(this).addClass('selectedOption')
    }

    dayUL.appendChild(li)
  }

  const shadow = document.getElementById('minkWrapper').shadowRoot

  const existingDaysUL = shadow.getElementById('days')
  const existingTimesUL = shadow.getElementById('times')
  const drilldownShadow = shadow.getElementById('drilldownBox')

  if (existingDaysUL) {
    drilldownShadow.removeChild(existingDaysUL)
  }

  if (existingTimesUL) {
    drilldownShadow.removeChild(existingTimesUL)
  }

  drilldownShadow.appendChild(dayUL)
}

function buildDrilldownTime (year, month, date) {
  const mementos = tmData.mementos.list

  let timeUL = document.createElement('ul')
  timeUL.id = 'times'

  let times = []

  for (let memento in mementos) {
    let datetime = moment(mementos[memento].datetime)

    if (datetime.year() !== year || monthNames[datetime.month()] !== month || datetime.date() !== date) {
      // REJECT
      continue
    }

    mementos[memento].time = addZ(datetime.hour()) + ':' + addZ(datetime.minute()) + ':' + addZ(datetime.second())
    times.push(mementos[memento])
  }

  for (let timeIndex in times) {
    let li = document.createElement('li')
    li.setAttribute('data-time', timeIndex)
    li.setAttribute('data-day', date)
    li.setAttribute('data-month', month)
    li.setAttribute('data-year', year)
    li.appendChild(document.createTextNode(times[timeIndex].time))

    li.onclick = function (event) {
      $(this).siblings().removeClass('selectedOption')
      $(this).addClass('selectedOption')
      window.location = times[timeIndex].uri
    }

    timeUL.appendChild(li)
  }

  const shadow = document.getElementById('minkWrapper').shadowRoot

  const existingTimesUL = shadow.getElementById('times')
  let drilldownShadow = shadow.getElementById('drilldownBox')

  if (existingTimesUL) {
    drilldownShadow.removeChild(existingTimesUL)
  }
  drilldownShadow.appendChild(timeUL)
}

function setupUI () {
  replaceContentScriptImagesWithChromeExtensionImages()
  bindSteps() // What steps!?!
  bindOptions()
  bindViewButton()
  bindDropdown()
  bindDrilldown()
  bindArchiveNowButton()
  bindGoBackToMainInterfaceButton()
  bindArchiveLogos()
  bindGoBackToLiveWebButton()
  bindNavigationButtons()

  $('#viewMementoButton').click(function () {
    window.location = $(this).attr('alt')
  })
}

function replaceContentScriptImagesWithChromeExtensionImages () {
  document.getElementById('minkLogo').src = chrome.extension.getURL('images/mink_marvel_80.png')

  document.getElementById('archivelogo_ia').src = chrome.extension.getURL('images/archives/iaLogo.png')
  document.getElementById('archivelogo_ais').src = chrome.extension.getURL('images/archives/archiveisLogo.png')
  document.getElementById('archivelogo_ala').src = chrome.extension.getURL('images/archives/allListedArchives.png')
}

function bindSteps () {
  $('#steps li').click(function () {
    if ($(this).attr('data-status') === 'waiting') {
      $(this).attr('data-status', 'processing')
    } else if ($(this).attr('data-status') === 'processing') {
      $(this).attr('data-status', 'complete')
    } else if ($(this).attr('data-status') === 'complete') {
      $(this).attr('data-status', 'waiting')
    }
  })
}

function bindOptions () {
  $('#options').click(function () {
    chrome.runtime.sendMessage({ method: 'openOptionsPage' })
  })
}

function bindViewButton () {
  let viewButton = $('#viewMementoButton')

  $('#mementosDropdown').change(function () {
    if ($(this)[0].selectedIndex === 0) {
      $(viewButton).attr('disabled', 'disabled')
      $(viewButton).removeAttr('alt')
    } else {
      $(viewButton).removeAttr('disabled')
      $(viewButton).attr('alt', $(this).find('option:selected').data('uri'))
    }
  })
}

function bindDropdown () {
  document.getElementById('title_dropdown').onclick = function () {
    const shadow = document.getElementById('minkWrapper').shadowRoot
    let mementosDropdown = shadow.getElementById('mementosDropdown')
    let viewMementoButton = shadow.getElementById('viewMementoButton')
    let drilldownBox = shadow.getElementById('drilldownBox')

    if (mementosDropdown.getAttribute('data-memento-count') + '' === '0') {
      window.alert('The dropdown interface is unavailable for large collections of mementos due to browser performance degradation.')
      return
    }

    mementosDropdown.className = 'dropdown'
    viewMementoButton.className = 'dropdown'
    shadow.getElementById('title_dropdown').className = 'active'
    drilldownBox.className = 'hidden'

    shadow.getElementById('title_drilldown').className = ''
  }
}

function bindDrilldown () {
  document.getElementById('title_drilldown').onclick = function () {
    const shadow = document.getElementById('minkWrapper').shadowRoot
    let mementosDropdown = shadow.getElementById('mementosDropdown')
    let viewMementoButton = shadow.getElementById('viewMementoButton')
    let drilldownBox = shadow.getElementById('drilldownBox')
    let drilldownTitle = shadow.getElementById('title_drilldown')
    const dropdownTitle = shadow.getElementById('title_dropdown')

    if (!dropdownTitle.classList.contains('disabled')) {
      mementosDropdown.className = 'dropdown hidden'
      viewMementoButton.className = 'dropdown hidden'
      shadow.getElementById('title_dropdown').className = ''
      drilldownBox.className = ''

      drilldownTitle.className = 'active'
    }
  }
}

function changeIconFor (id, src) {
  const shadow = document.getElementById('minkWrapper').shadowRoot
  shadow.querySelector('#' + id).setAttribute('src', src)
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.method === 'showViewingMementoInterface') {
      console.log('caught showViewingMementoInterface, tweak UI here')
    } else if (request.method === 'archiveDone') {
      changeIconFor(request.imgId, request.imgURI)
      showSuccessfullyArchivedURI(request.data, request.newTab)
    } else {
      console.log('caught message in minkui.html but did not react')
    }
  }
)

function showSuccessfullyArchivedURI(uri, openInNewTab) {
      chrome.runtime.sendMessage({
        method: 'notify',
        title: 'Mink',
        body: 'Archive.org Successfully Preserved page.\r\nSelect again to view.'
      }, function (response) {})

      const shadow = document.getElementById('minkWrapper').shadowRoot
      shadow.getElementById('archivelogo_ia').classList.add('archiveNowSuccess')

      const archiveURI = 'https://web.archive.org' + uri
      shadow.getElementById('archivelogo_ia').setAttribute('title', archiveURI)
      shadow.getElementById('archivelogo_ia').onclick = function () {
        if (!openInNewTab) {
          window.location = $(this).attr('title')
        } else {
          window.open($(this).attr('title'))
        }
      }
}

function displayAndHideShadowDOMElements (showElementsIds, hideElementsIds) {
  const shadow = document.getElementById('minkWrapper').shadowRoot

  let ee
  for (ee = 0; ee < showElementsIds.length; ee++) {
    shadow.getElementById(showElementsIds[ee]).classList.remove('hidden', 'nonArchiveNowInterface')
  }

  for (ee = 0; ee < hideElementsIds.length; ee++) {
    shadow.getElementById(hideElementsIds[ee]).classList.add('hidden', 'nonArchiveNowInterface')
  }
}

function bindArchiveNowButton () {
  $('#minkuiX #archiveNow').click(function () {
    const show = ['archiveNowInterface']
    let hide = ['archiveNow', 'steps']

    const shadow = document.getElementById('minkWrapper').shadowRoot
    const dropdownActive = shadow.getElementById('title_dropdown').classList.contains('active')
    const drilldownActive = shadow.getElementById('title_drilldown').classList.contains('active')

    if (dropdownActive) {
      hide.push('mementosDropdown', 'viewMementoButton')
    } else if (drilldownActive) {
      hide.push('drilldownBox')
    }

    displayAndHideShadowDOMElements(show, hide)
  })
}

function bindGoBackToMainInterfaceButton () {
  $('#minkuiX #goBackButton').click(function () {
    const hide = ['archiveNowInterface']
    let show = ['archiveNow', 'steps']

    const shadow = document.getElementById('minkWrapper').shadowRoot
    const dropdownActive = shadow.getElementById('title_dropdown').classList.contains('active')
    const drilldownActive = shadow.getElementById('title_drilldown').classList.contains('active')

    if (dropdownActive) {
      show.push('mementosDropdown', 'viewMementoButton')
    } else if (drilldownActive) {
      show.push('drilldownBox')
    }

    displayAndHideShadowDOMElements(show, hide)
  })
}

function bindArchiveLogos () {
  let iaLogo = $('#archivelogo_ia')
  let aisLogo = $('#archivelogo_ais')

  let alaLogo = $('#archivelogo_ala') // All archives

  let openInNewTab = false

  $('.archiveLogo').click(function () {
    if ($(this).attr('src').indexOf('_success') > -1) { // Already archived, view
      return
    }

    let that = this
    const newSrc = $(this).attr('src').replace('.png', '_success.png')
    $(this).attr('src', chrome.extension.getURL('./images/spinner.gif'))

    const archiveLogoID = $(this).attr('id')
    const cb = function () { changeIconFor(that, newSrc) }

    let img = {
      'id': 'archivelogo_ia',
      'uri': newSrc
    }

    if (archiveLogoID === 'archivelogo_ia') {
      let archiveid = 'ia'
      archiveURI(img, archiveid, openInNewTab)
    } else if (archiveLogoID === 'archivelogo_ais') {
      let archiveid='ais'
      img['id'] = 'archivelogo_ais'
      archiveURI(img, archiveid, openInNewTab)
    } else if (archiveLogoID === 'archivelogo_ala') { // Async calls to 2 archives

      //TOFIX: match above calls
      const iaNewSrc = $(iaLogo).attr('src').replace('.png', '_success.png')
      const aisNewSrc = $(aisLogo).attr('src').replace('.png', '_success.png')

      // This might be better accomplished with Promise.all()
      const iaCb = function () {
        changeIconFor(iaLogo, iaNewSrc)
        changeArchiveAllIconWhenComplete(alaLogo)
      }
      const aisCb = function () {
        changeIconFor(aisLogo, aisNewSrc)
        changeArchiveAllIconWhenComplete(alaLogo)
      }

      $(iaLogo).attr('src', chrome.extension.getURL('./images/spinner.gif'))
      $(aisLogo).attr('src', chrome.extension.getURL('./images/spinner.gif'))

      openInNewTab = true
      archiveURIArchiveOrg(iaCb, openInNewTab)
      archiveURIArchiveDotIs(aisCb, openInNewTab)
    }
  })
}

var archivesFinished = 0 /* TOFIX This is doubly declared if 'let' */
function changeArchiveAllIconWhenComplete (iconObj) {
  archivesFinished++
  if (archivesFinished >= 2) {
    $(iconObj).attr('src', chrome.extension.getURL('./images/archives/allListedArchives_success.png'))
    $(iconObj).unbind()
    $(iconObj).removeClass('archiveLogo')
  }
}

function bindGoBackToLiveWebButton () {
  $('#backToLiveWeb').click(function () {
    chrome.storage.local.get('timemaps', function (items) {
      window.location = items.timemaps[document.URL].original
    })
  })
}

function bindNavigationButtons () {
  ['first', 'last', 'next', 'prev'].forEach(function attachURI (rel) {
    document.getElementById('memento_' + rel).addEventListener('click', event => {
      window.location = event.target.getAttribute('data-uri')
    })
  })
}

if ($('#minkWrapper').length === 0) {
  appendHTMLToShadowDOM()
} else {
  $('#minkWrapper').toggle()
}
