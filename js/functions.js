
// Base URL for DB:
const base_url = "https://script.google.com/macros/s/AKfycbwbFsR030BbU2PHHWmHrEJWxMjXDihCbGXz3tVNZNCeDKXxnDYPobwjEjjcjawPt2ZG/exec"

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Track online/offline status
window.addEventListener('online', () => {
  console.log('App is now online');
  updateOnlineStatus(true);
  updateLyrics();
});

window.addEventListener('offline', () => {
  console.log('App is now offline');
  updateOnlineStatus(false);
});

// Update UI to show online/offline status
function updateOnlineStatus(isOnline) {
  const statusElement = document.getElementById('online-status');
  if (statusElement) {
    if (isOnline) {
      statusElement.textContent = 'Online';
      statusElement.className = 'online';
    } else {
      statusElement.textContent = 'Offline';
      statusElement.className = 'offline';
    }
  }
}

var b = {
  "js": 6,
  6: "js",
  "sr": 1,
  1: "",
  "ps": 5,
  5: "ps",
  "hm": 3,
  3: "hm",
  "tsr": 2,
  2: ""
};

function setFocusTo(field){
  document.getElementById(field).focus();
}

// Copy lyrics into clipboard
function ttc (text) {
  var range = document.createRange();
  range.selectNode(document.getElementById("lyric"));
  window.getSelection().removeAllRanges(); 
  window.getSelection().addRange(range); 
  document.execCommand("copy");
  window.getSelection().removeAllRanges();
}

// Copy link to clipboard
function copyLink() {
  window.navigator.clipboard.writeText(window.location.href);
}

// Font resize function-----------------------------------------------
var changeFontSize = function (increaseFont) {
  var fontTargets = new Array('#thelyric');
  fontTargets.forEach(function (element) {
    var $element = $(element);
    var newFontSize;
    var currentFontSize = $element.css('font-size');
    var currentFontSizeNum = parseFloat(currentFontSize, 10);

    if (increaseFont) {
      $element.css('font-size', 0);
      newFontSize = currentFontSizeNum + 1;
    } else {
      newFontSize = currentFontSizeNum - 1;
    }

    $element.css('font-size', newFontSize);
    var date = new Date();
    date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));  // 100 years
    var expires = "expires=" + date.toUTCString();
    document.cookie = "FontSize=" + newFontSize + "; " + expires + "; path=/; SameSite=None; Secure";
    console.log(newFontSize); 
  });
};


$(document).ready(function () {
    // Open lyric specified in URL
    const pathName = window.location.search;
    try { 
	const sbnr = pathName.split(",");
	const nSbnr = sbnr[0].replace("?", "");
	createSearchArray(nSbnr,sbnr[1]);
    }
    catch (e) {
	console.log("It's an Error: " + e);
    }

    // Reset Font Size
    try {
        var FontSize = Cookies.get('FontSize');
    } catch {
        var FontSize = 14;
    } finally {
        console.log("Font Size is: " + FontSize)
    }
    console.log("Original fontsize: " + FontSize);
    $(".resetFont").click(function () {
        $('html').css('font-size', FontSize);
    });
    // Increase Font Size
    $(".increaseFont").on('click', function () {
        changeFontSize(true);
    });
    // Decrease Font Size
    $(".decreaseFont").on('click', function () {
        changeFontSize(false);
    });
});

var key = null;

function getBookID(nr) {
    if ( nr <= 684 ) {
        return "1";
    } else {
        return "2";
    }
}

// Create a query from URI
function createSearchArray(nr, sb) {
    if ( sb != undefined ) { 
        var bsb = b[sb];
    } else {
        var bsb = getBookID(nr);
    } 
    var entries = {};
    db.lyrics.where("nr").equals(nr).each(function (item) {
        entries[item.sb] = item.id;
    }).then(function () {
        getLyric(entries[bsb]);
    }).catch(function (error) {
        console.error("Error in createSearchArray:", error);
    });
}


// Clear LocalStorage and DB
async function clearSite() {
    // Unregister all Service Workers
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
                console.log('Service Worker unregistered:', registration.scope);
            }
        } catch (error) {
            console.error('Error unregistering Service Workers:', error);
        }
    }

    // Clear all caches
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
                await caches.delete(cacheName);
                console.log('Cache cleared:', cacheName);
            }
        } catch (error) {
            console.error('Error clearing caches:', error);
        }
    }

    // Delete IndexedDB
    try {
        await db.delete();
        console.log('IndexedDB deleted');
    } catch (error) {
        console.error('Error deleting IndexedDB:', error);
    }

    // Clear localStorage
    try {
        window.localStorage.clear();
        console.log('LocalStorage cleared');
    } catch (error) {
        console.error('Error clearing localStorage:', error);
    }

    // Clear sessionStorage
    try {
        window.sessionStorage.clear();
        console.log('SessionStorage cleared');
    } catch (error) {
        console.error('Error clearing sessionStorage:', error);
    }

    // Clear all cookies
    try {
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('All cookies cleared');
    } catch (error) {
        console.error('Error clearing cookies:', error);
    }

    // Reload page
    console.log('Clearing complete. Reloading page...');
    location.reload();
}

// IndexedDB functions ------------------------------------------------
var db = new Dexie("SR");
db.version(6).stores( {
    lyrics: "id, nr, search, ts, sb, browse, bookmarked",
    bookmarks: "++id, lyrics_id, excerpt"
});
// Function to set timestamp cookie
function setTimestampCookie(cookieName) {
    var timestamp = Math.floor(Date.now() / 1000);
    var date = new Date();
    date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000)); 
    var expires = "; expires=" + date.toUTCString();
    document.cookie = cookieName + "=" + timestamp + expires + "; path=/; SameSite=None; Secure";
}

function updateDbVersionCookie(version) {
    console.log('Updating Cookie db_version to: ' + version);
    var date = new Date();
    date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));  // 100 years
    var expires = "expires=" + date.toUTCString();
    document.cookie = "db_version=" + version + "; " + expires + "; path=/; SameSite=None; Secure";
    console.log('Cookie db_version updated successfully');
}

function ajaxSR(key1, version) {
    return new Dexie.Promise(function (resolve, reject) {
        var now = Math.floor(Date.now() / 1000);

        // Här är din nya JSON-länk från Apps Script
        const url = base_url + "?action=lyrics&key=" + key1;

        $.ajax(url, {
            type: 'get',
            dataType: 'json',
            timeout: 15000,
            error: function (xhr, textStatus, errorThrown) {
                console.error('Error loading lyrics:', textStatus, errorThrown);
                if (textStatus === 'timeout') {
                    console.log('Request timed out - checking if offline');
                } else if (textStatus === 'error') {
                    console.log('Network error - offline mode activated');
                }
                reject(textStatus);
            },
            success: function (data) {
                resolve(data);
            }
        });
    }).then(function (data) {
        $('#lyric').html("Databasen uppdateras nu... var god vänta...");
        
        return db.transaction('rw', db.lyrics, function () {
            data.forEach(function (item) {
                console.log("Inserting item with id: ", item.id); 
                db.lyrics.add(item);
            });
        }).then(function() {
            // Uppdatera cookie med versionen som hämtades från servern
            if (version) {
                updateDbVersionCookie(version);
            }
            console.log('Done inserting data into DB.')
            $('#lyric').html("Klart! Du kan nu söka efter sånger i sökfältet längst upp på sidan.");
        });
    }).catch(function (error) {
        console.error('Failed to load database:', error);
        if (navigator.onLine === false) {
            $('#lyric').html("<h3>Du är offline</h3><p>Databasen kunde inte laddas ner. Använd sångorna som redan finns sparade i webbläsaren.</p>");
        } else {
            $('#lyric').html("<h3>Fel vid laddning</h3><p>Det uppstod ett problem vid hämtning av databasen. Försök igen senare.</p>");
        }
        reject(error);
    });
}


// Function to generate the key in JavaScript (same logic as in Python)
function generateKey(password) {
    let hash = CryptoJS.SHA256(password);  // Generate SHA256 hash of the password
    let key = hash.toString(CryptoJS.enc.Base64);  // Convert to base64 encoding
    return key;
}

// Decryption function using the Fernet algorithm
function decryptField(encryptedValue, password) {
    let key = generateKey(password);  // Generate the key based on the password
    let secret = new fernet.Secret(key);  // Create a Fernet Secret using the key
    
    let token = new fernet.Token({
        secret: secret,
        token: encryptedValue,
        ttl: 0  // Token lifetime (set to 0 to ignore expiration for now)
    });

    return token.decode();  // Return the decrypted value
}



// Populate DB if empty
db.on('ready', function () {
    return db.lyrics.count(function (count) {
        if (count == 0) {
	    $( '#lyric' ).html("Databasen är tom. Laddar, vänligen vänta...");
	    var key1 = Cookies.get('key1');
            
            // Check if online before attempting to load
            if (!navigator.onLine) {
                $( '#lyric' ).html("<h3>Du är offline</h3><p>Databasen kunde inte laddas eftersom du inte är ansluten till internet. Försök igen när du är online.</p>");
                return;
            }
            
            // Hämta versionen först, sedan ladda databasen
            $.ajax(base_url + "?action=ts&key=" + key1, {
                type: 'get',
                dataType: 'json',
                timeout: 10000,
                error: function (xhr, textStatus, errorThrown) {
                    console.error('Failed to fetch version:', textStatus, errorThrown);
                    if (navigator.onLine) {
                        $( '#lyric' ).html("<h3>Anslutningsfel</h3><p>Det gick inte att ansluta till servern. Försök igen senare.</p>");
                    } else {
                        $( '#lyric' ).html("<h3>Du är offline</h3><p>Databasen kunde inte laddas eftersom du inte är ansluten till internet.</p>");
                    }
                },
                success: function (data) {
                    var version = data.version;
                    console.log('Fetched DB version from server: ' + version);
                    ajaxSR(key1, version);
                }
            });
        }
    });
});


function ajaxUpdateSR(key1, curVer) {
    return new Dexie.Promise(function (resolve, reject) {
        var now = Math.floor(Date.now() / 1000);
        $.ajax(base_url + "?action=ts&key=" + key1, {
            type: 'get',
            dataType: 'json',
            timeout: 10000,
            error: function (xhr, textStatus, errorThrown) {
                console.error('Error checking for updates:', textStatus, errorThrown);
                reject(textStatus);
            },
            success: function (data) {
                resolve(data);
            }
        });
    }).then(function (data) {
        var newVersion = parseInt(data.version, 10);
        console.log("Current Online DB version is: " + newVersion)
        if (newVersion > curVer) {
            $( '#lyric' ).html('<p><strong><a href="javascript:clearSite();">Det finns en ny sångdatabas. Klicka här för att uppdatera.</a></strong></p>');
        }
    }).catch(function (error) {
        console.log('Could not check for updates (offline?):', error);
        // Silently fail - don't show error to user if offline
    });
}


// Version check and update lyrics db
function updateLyrics() {
    // Get the current version from the 'db_version' cookie
    var curVer = Cookies.get('db_version');
    var key1 = Cookies.get('key1');

    if (navigator.onLine) {
        console.log("Navigator is online and current downloaded DB version is " + curVer);
        ajaxUpdateSR(key1, curVer);
    }
}

updateLyrics();

function checkBookmark(id) {
    // Return bookmark id if bookmark exist
    db.transaction('r', db.bookmarks, function() {
	console.log("Preparing...");
        db.bookmarks.where("lyrics_id").equals(id).count(function(count){
	    console.log("Thinking..." + count);
            if ( count < 1 ) {
		console.log("False...");
                return false;
            } else {
                db.bookmarks.where("lyrics_id").equals(id).each(function(item) {
		    return item.id;
                });
            }
        });
    }).catch(function(error) {
        console.error("Dexie transaction error: " + error.stack || error);
    }); 
}

function gAnalytics(nr,sb,event) {
    gtag('event', event, {
        'page_title': "Särlaregn nr. " + nr,
        'page_path': "/" + nr + "" + sb
    });
}

// Load lyric into div
function getLyric(id) {
    db.lyrics.where("id").equals(id).each(function(item) {
	$( '#lyric' ).html(item.value);
	$( '#sNext' ).attr("href", "javascript:selectNext(" + item.browse + ");");
	$( '#sPrev' ).attr("href", "javascript:selectPrev(" + item.browse + ");");
	var fs = Cookies.get('FontSize');
    console.log("Fontsize in cookie: " + fs)
	$( '#thelyric' ).css("font-size", fs + "px");
	if ( item.sb == "1" || item.sb == "2" ) { var upt2 = ""; } else { var upt2 = "," + b[item.sb]; }
	history.pushState({}, "", "/?" + item.nr + upt2);
	document.title = "Särlaregn nr. " + item.nr; 
        if(item.bookmarked == "true") {
            $( '#bm_field').html('<a href=\"javascript:delete_bookmark(\'' + id + '\');\">Ta bort bokmärke</a><br>');
        } else {
            $( '#bm_field').html('<a href=\"javascript:add_bookmark(\'' + id + '\');\">Lägg till bokmärke</a><br>');
        }
    })
}


// Navigate with keyboard
$(document).on("keydown",function(event) {
    if(event.which == 37) {
        $( '#sPrev' )[0].click();
    }
    if(event.which == 39) {
        $( '#sNext' )[0].click();
    }
    if(event.which == 66) {
        bookmarks();
    }
});



// Bookmarks SWIPE
$(function() {
    $( '.browsemenu' ).swipe( {
        doubleTap:function(event) {
	    bookmarks();
	},
	doubleTapThreshold:50
    });
});



// Zoom
$(function(){
    $( 'html' ).swipe( {
        pinchIn:function(event) {
	    changeFontSize(true);
        },
        pinchOut:function(event) {
            changeFontSize(false);
        },
	fingers:2,
	pinchTreshold:0
    });
});




// Swipe to next or prev
$(function(){
    $( '.body' ).swipe( {
        swipeLeft:function(event, direction, distance, duration, fingerCount) { 
            $( '#sNext' )[0].click();
	},
	swipeRight:function(event, direction, distance, duration, fingerCount) {
            $( '#sPrev' )[0].click();
	},
	fingers:1,
	treshold:25
    });
});





// Select next lyric
function selectNext(curLyric) {
    db.lyrics.where("browse").above(curLyric).limit(1).each(function(item){
        getLyric(item.id);
    });
}


// Select previous lyric 
function selectPrev(curLyric) {
    db.lyrics.where("browse").below(curLyric).reverse().limit(1).each(function(item){
        getLyric(item.id);
    });
}




// Print bookmarks
function bookmarks() {
    var bm_list = new Array();
    bm_list.push("<h2>Bokmärken</h2>");
    db.lyrics.where("bookmarked").equals("true").each(function(bookmark) {
        var link = '<p><a href="javascript:getLyric(\'' + bookmark.id + '\');">' + bookmark.label + '</a>';
	bm_list.push(link);
    }).then(function() { 
	$( '#lyric' ).html(bm_list.join(''))
	$( '#bm_field' ).html("");
    }).catch(function (error) {
	console.error(error);
    });
}


// Add bookmark
function add_bookmark(id) {
    db.lyrics.update(id, {bookmarked: "true"});
    getLyric(id);
}

// Delete bookmark
function delete_bookmark(id) {
    db.lyrics.update(id, {bookmarked: "false"});
    getLyric(id);
}

// Function for loading html page into div 	
function loadPage(page){
    var htmlpage = page + ".html";
    $( '#bm_field' ).html("");
    $( '#lyric' ).load(htmlpage).attr("href");
}

// Autocomplete function -----------------------------------------------
$(function() {
    var thearray = new Array();
    $( "#sok" ).autocomplete({
        minLength: 1,
        source: function( request, response ) {
            var theSearchLC = request.term.toLowerCase().replace(/\s+|-/g, '');
            var i = 0;
	    if($.isNumeric(theSearchLC) == false) {
		db.lyrics.where("id").above(0).each(function(item) {
		    if (item && i < 10) {
		        if (item.search.indexOf(theSearchLC) !== -1) {
			    i++;
			    thearray.push({ id : item.id, value : item.label, label : item.label });
			}
		    }
		}).then(function() { 
		    response(thearray); thearray = [];
		}) 
	    } else {
		db.lyrics.where("nr").equals(theSearchLC).each(function(item) {	
		    thearray.push({ id : item.id, value : item.label, label : item.label });
		}).then(function() { 
		    response(thearray); thearray = [];
		})
	    }
	},
        select: function( event, ui ) {
	    getLyric(ui.item.id);
	    document.activeElement.value='';
	    document.activeElement.blur();
        }
    });
});
/*
// Ensure .body is positioned under #bottom even if #bottom height changes
function adjustBodySpacing() {
    try {
        var bottom = document.getElementById('bottom');
        var bodyEl = document.querySelector('.body');
        if (!bottom || !bodyEl) return;
        // Use offsetHeight which excludes margins but gives actual element height
        var spacing = bottom.offsetHeight + 10; // 10px gap
        bodyEl.style.marginTop = spacing + 'px';
    } catch (e) {
        console.warn('adjustBodySpacing error:', e);
    }
}*/

// Run on initial load and on resize
window.addEventListener('load', adjustBodySpacing);
window.addEventListener('resize', adjustBodySpacing);

// If browser supports ResizeObserver, use it to react to changes in #bottom
if (window.ResizeObserver) {
    var ro = new ResizeObserver(function() {
        adjustBodySpacing();
    });
    var bottomEl = document.getElementById('bottom');
    if (bottomEl) ro.observe(bottomEl);
}

// Fallback: observe DOM mutations inside #bottom
if (window.MutationObserver) {
    var mo = new MutationObserver(function() {
        adjustBodySpacing();
    });
    var bottomNode = document.getElementById('bottom');
    if (bottomNode) mo.observe(bottomNode, { childList: true, subtree: true, attributes: true });
}
