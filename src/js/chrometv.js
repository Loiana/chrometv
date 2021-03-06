var CHROMETV_URL = 'dextra.com.br'; // use http://www.dextra.com.br?key=xxx
var GOOGLE_LOGIN_URL = 'accounts.google.com';
var APP_ENGINE_URL = 'appengine.google.com';

var WAIT_LOAD_DELAY = 70 * 1000;

var currentChannel = -1;

var channels = [];

var currentTab = -1;

var tabs = [];

var googleUser = 'foo';

var googlePassword = 'bar';

function Channel(url, timeOnAir) {
    this.url = url;
    this.timeOnAir = (timeOnAir * 60 * 1000) + WAIT_LOAD_DELAY;
}

function loadChannels(json) {
    var cells = json.feed.entry;
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        channels[i] = new Channel(cell.gsx$url.$t, cell.gsx$time.$t);
    }
}

function initChannels(setupSpreadsheetKey) {
    $.ajax({
        type : 'GET',
        url : 'https://spreadsheets.google.com/feeds/list/' + setupSpreadsheetKey + '/1/public/values?alt=json',
        dataType : 'json',
        success : function(json) {
            loadChannels(json);
            changeChannel();
        },
        error : function(jqXHR, textStatus, errorThrown) {
            alert('(' + jqXHR.status + ' ' + jqXHR.statusText + ') ' + jqXHR.responseText);
        }
    });
}

function changeChannel() {
    var channel = nextChannel();
    var tab = nextTab();

    chrome.tabs.update(tab.id, {
        url : channel.url
    });

    setTimeout(changeTab, WAIT_LOAD_DELAY);
    setTimeout(changeChannel, channel.timeOnAir);
}

function changeTab() {
    var tab = tabs[currentTab];
    chrome.tabs.update(tab.id, {
        active : true
    });
}

function nextChannel() {
    currentChannel = (currentChannel + 1) % channels.length;
    return channels[currentChannel];
}

function nextTab() {
    currentTab = (currentTab + 1) % tabs.length;
    return tabs[currentTab];
}

function initTabs(currentTabId) {
    chrome.tabs.get(currentTabId, function(tab) {
        tabs.push(tab);
    });

    chrome.tabs.create({
        active : false,
        url : 'about:blank'
    }, function(tab) {
        tabs.push(tab);
    });
}

function init(tabId, url) {
    if (!isChromeTV(url)) {
        return;
    }

    chrome.tabs.update(tabId, {
        url : 'about:blank'
    });

    initGoogle(getURLParameter(url, 'user'), getURLParameter(url, 'password'));
    initTabs(tabId);
    initChannels(getURLParameter(url, 'key'));
}

function initGoogle(user, password) {
    googleUser = user;
    googlePassword = password;
}

chrome.tabs.onUpdated.addListener(function(tab) {
    chrome.tabs.getSelected(function(tab) {
        init(tab.id, tab.url);
    });
});

chrome.webNavigation.onDOMContentLoaded.addListener(function(details) {
    var url = details.url;
    if (isGoogleLogin(url)) {
        exeucuteGoogleLoginScript(details.tabId);
        return;
    }
    if (isRequestingPermission(url)) {
        grantPermission(details.tabId);
        return;
    }

    //removeGoogleDocsHeaders(details.tabId);
});

function exeucuteGoogleLoginScript(tabId) {
    $.get('js/google_login.js', function(code) {
        code += "\n"
        code += "doGoogleLogin('" + googleUser + "', '" + googlePassword + "');";
        chrome.tabs.executeScript(tabId, {
            code : code
        }, function(response) {
        });
    });
}

function removeGoogleDocsHeaders(tabId) {
    chrome.tabs.insertCSS(tabId, {
        code : "html { overflow: hidden; } #header { display: none; } #footer { display: none; }"
    }, function(response) {
        // alert(details.tabId + ', '+ response);
    });
}

function grantPermission(tabId) {
    $.get('js/google_permission.js', function(code) {
        chrome.tabs.executeScript(tabId, {
            code: code
        }, function(response) {
        });
    });
}

function isChromeTV(url) {
    return url.indexOf('//' + CHROMETV_URL + '/') != -1;
}

function isGoogleLogin(url) {
    return url.indexOf('//' + GOOGLE_LOGIN_URL + '/') != -1;
}

function isRequestingPermission(url) {
    return url.indexOf('//' + APP_ENGINE_URL + '/') != -1;
}
