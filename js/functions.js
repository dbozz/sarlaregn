
// Base URL for DB:
const base_url = "https://script.google.com/macros/s/AKfycbwbFsR030BbU2PHHWmHrEJWxMjXDihCbGXz3tVNZNCeDKXxnDYPobwjEjjcjawPt2ZG/exec"
//https://script.google.com/macros/s/AKfycbwbFsR030BbU2PHHWmHrEJWxMjXDihCbGXz3tVNZNCeDKXxnDYPobwjEjjcjawPt2ZG/exec
// DOM Cache
const DOM = {
  lyric: null,
  thelyric: null,
  bmField: null,
  sNext: null,
  sPrev: null
};

// Initialize DOM cache when ready
function initDOMCache() {
  DOM.lyric = document.getElementById('lyric');
  DOM.thelyric = document.getElementById('thelyric');
  DOM.bmField = document.getElementById('bm_field');
  DOM.sNext = document.getElementById('sNext');
  DOM.sPrev = document.getElementById('sPrev');
}

// Cookie helper functions
function getCookie(name) {
  return Cookies.get(name);
}

function setCookie(name, value, days = 36500) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + "; " + expires + "; path=/; SameSite=None; Secure";
}

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
    statusElement.textContent = isOnline ? 'Online' : 'Offline';
    statusElement.className = isOnline ? 'online' : 'offline';
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

// Export song as OpenSong XML file
function exportOpenSong(id) {
    db.lyrics.where("id").equals(id).each(function(item) {
        const xmlContent = generateOpenSongXML(item);
        const title = item.label.replace(/\{[^}]*\}/g, '').trim();
        const songNumber = item.nr;
        
        // Create blob and download
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Detect if Android and adjust filename accordingly
        const isAndroid = /Android/i.test(navigator.userAgent);
        const cleanTitle = title.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, '').replace(/\s+/g, '-');
        const fileExtension = isAndroid ? '' : '.xml';
        a.download = `SR-${songNumber}-${cleanTitle}${fileExtension}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// Helper function to escape XML special characters
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Helper function to generate OpenSong XML content for a song
function generateOpenSongXML(item) {
    // Extract song title and number
    const title = item.label.replace(/\{[^}]*\}/g, '').trim();
    const songNumber = item.nr;
    
    // Get song key from database if available and normalize it (uppercase with lowercase 'm')
    let songKey = item.key || '';
    if (songKey) {
        songKey = songKey.replace(/^([a-g])(m?)(.*)$/i, (match, note, minor, rest) => {
            return note.toUpperCase() + minor.toLowerCase() + rest.toUpperCase();
        });
    }
    
    // Parse HTML content and extract lyrics with chords
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.value;
    
    let lyrics = '';
    const verses = tempDiv.querySelectorAll('div.pt');
    
    verses.forEach((verse, index) => {
        // Get verse content with chords intact
        let verseHtml = verse.innerHTML;
        
        // Split by <br> tags to get individual lines
        const lines = verseHtml.split(/<br\s*\/?>/gi);
        
        // Add verse marker
        lyrics += `[V${index + 1}]\n`;
        
        lines.forEach(line => {
            // Remove HTML tags but keep chords in curly braces
            line = line.replace(/<[^>]*>/g, '');
            
            // Decode HTML entities
            const textArea = document.createElement('textarea');
            textArea.innerHTML = line;
            line = textArea.value.trim();
            
            if (!line) return; // Skip empty lines
            
            // Extract chords and text
            const chordPattern = /\{([^}]*)\}/g;
            const chords = [];
            let chordMatch;
            
            // Collect all chords and their positions
            while ((chordMatch = chordPattern.exec(line)) !== null) {
                // Convert chord to uppercase, but preserve 'm' for minor chords
                let chord = chordMatch[1];
                // Convert to uppercase but keep lowercase 'm' when it appears after a note
                chord = chord.replace(/^([a-g])(m?)(.*)$/i, (match, note, minor, rest) => {
                    return note.toUpperCase() + minor.toLowerCase() + rest.toUpperCase();
                });
                
                chords.push({
                    chord: chord,
                    position: chordMatch.index
                });
            }
            
            // Remove chords from text line
            let textLine = line.replace(/\{[^}]*\}/g, '');
            
            // If there are chords, create chord line with dots and spaces
            if (chords.length > 0) {
                let chordLine = '.';
                let lastPos = 0;
                
                chords.forEach(({chord, position}) => {
                    // Calculate position in text (accounting for removed chord markers)
                    const textPos = position - (line.substring(0, position).match(/\{[^}]*\}/g) || []).join('').length;
                    // Add spaces before chord (no brackets on chord line)
                    chordLine += ' '.repeat(Math.max(0, textPos - lastPos)) + chord;
                    lastPos = textPos + chord.length;
                });
                
                lyrics += chordLine + '\n';
                
                // Add space at the beginning of text line to align with chord line
                textLine = ' ' + textLine;
            }
            
            // Add text line (with leading space if there are chords)
            lyrics += textLine + '\n';
        });
        
        lyrics += '\n'; // Empty line after verse
    });
    
    // Create OpenSong XML structure with all required fields
    return `<?xml version="1.0" encoding="UTF-8"?>
<song>
  <title>${escapeXml(title)}</title>
  <author></author>
  <copyright></copyright>
  <presentation></presentation>
  <hymn_number>${songNumber}</hymn_number>
  <capo print="false"></capo>
  <tempo></tempo>
  <time_sig></time_sig>
  <duration>0</duration>
  <predelay></predelay>
  <ccli></ccli>
  <theme></theme>
  <alttheme></alttheme>
  <user1>Särlaregn ${songNumber}</user1>
  <user2></user2>
  <user3></user3>
  <beatbuddysong></beatbuddysong>
  <beatbuddykit></beatbuddykit>
  <key>${escapeXml(songKey)}</key>
  <keyoriginal>${escapeXml(songKey)}</keyoriginal>
  <aka></aka>
  <midi></midi>
  <midi_index></midi_index>
  <notes></notes>
  <lyrics>${escapeXml(lyrics.trim())}</lyrics>
  <pad_file>auto</pad_file>
  <custom_chords></custom_chords>
  <link_youtube></link_youtube>
  <link_web></link_web>
  <link_audio></link_audio>
  <loop_audio></loop_audio>
  <link_other></link_other>
  <abcnotation></abcnotation>
  <abctranspose>0</abctranspose>
</song>`;
}

// Export all songs as a ZIP file
async function exportAllSongs() {
    try {
        // Check if JSZip is loaded
        if (typeof JSZip === 'undefined') {
            alert('JSZip biblioteket kunde inte laddas. Ladda om sidan och försök igen.');
            return;
        }
        
        // Show progress message
        if (DOM.lyric) DOM.lyric.innerHTML = '<h2>Förbereder nedladdning...</h2><p>Detta kan ta en stund, var god vänta...</p>';
        
        const zip = new JSZip();
        const isAndroid = /Android/i.test(navigator.userAgent);
        const fileExtension = isAndroid ? '' : '.xml';
        
        // Get all songs from database
        const allSongs = await db.lyrics.toArray();
        
        let processed = 0;
        const total = allSongs.length;
        
        // Process each song
        for (const item of allSongs) {
            const xmlContent = generateOpenSongXML(item);
            // Remove song number from title (it's already in item.label)
            const title = item.label.replace(/\{[^}]*\}/g, '').replace(/^\d+\s*/, '').trim();
            const cleanTitle = title.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, '').replace(/\s+/g, '-');
            const filename = `SR-${item.nr}-${cleanTitle}${fileExtension}`;
            
            zip.file(filename, xmlContent);
            
            processed++;
            if (processed % 50 === 0 && DOM.lyric) {
                DOM.lyric.innerHTML = `<h2>Förbereder nedladdning...</h2><p>Bearbetar sånger: ${processed}/${total}</p>`;
            }
        }
        
        // Generate ZIP file
        if (DOM.lyric) DOM.lyric.innerHTML = '<h2>Skapar ZIP-fil...</h2><p>Nästan klart...</p>';
        
        const blob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // Download the ZIP file
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Sarlaregn-alla-sanger.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        if (DOM.lyric) {
            DOM.lyric.innerHTML = `<h2>Klart!</h2><p>${total} sånger har laddats ner som en ZIP-fil.</p><p><a href="javascript:loadPage('help');">Tillbaka till hjälp</a></p>`;
        }
        
    } catch (error) {
        console.error('Error exporting all songs:', error);
        if (DOM.lyric) {
            DOM.lyric.innerHTML = '<h2>Fel</h2><p>Det uppstod ett problem vid export av sångerna. Försök igen.</p><p><a href="javascript:loadPage(\'help\');">Tillbaka till hjälp</a></p>';
        }
    }
}


// Font resize function-----------------------------------------------
var changeFontSize = function (increaseFont, step) {
  step = step || 1;
  
  // Always get element fresh from DOM (not cached) since #thelyric is loaded dynamically
  const thelyric = document.getElementById('thelyric');
  if (!thelyric) {
    console.warn('thelyric element not found - no song loaded yet');
    return;
  }
  
  const currentFontSize = parseFloat(window.getComputedStyle(thelyric).fontSize, 10);
  let newFontSize;

  if (increaseFont) {
    newFontSize = currentFontSize + step;
  } else {
    newFontSize = Math.max(10, currentFontSize - step);
  }

  thelyric.style.fontSize = newFontSize + 'px';
  setCookie('FontSize', newFontSize);
  console.log('Font size changed to:', newFontSize);
};


$(document).ready(function () {
    // Initialize DOM cache
    initDOMCache();
    
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


// Reload IndexedDB only (keep everything else)
async function reloadDatabase() {
    try {
        if (DOM.lyric) DOM.lyric.innerHTML = "Databasen laddar om... var god vänta...";
        
        await db.delete();
        console.log('IndexedDB deleted. Reloading page...');
        location.reload();
    } catch (error) {
        console.error('Error reloading database:', error);
        if (DOM.lyric) DOM.lyric.innerHTML = "<h3>Fel vid omstart</h3><p>Det uppstod ett problem vid omstart av databasen.</p>";
    }
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

    // Reset URL to root before reloading
    console.log('Clearing complete. Resetting URL and reloading page...');
    window.history.replaceState({}, '', '/');
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

/* // Decryption function using the Fernet algorithm
function decryptField(encryptedValue, password) {
    let key = generateKey(password);  // Generate the key based on the password
    let secret = new fernet.Secret(key);  // Create a Fernet Secret using the key
    
    let token = new fernet.Token({
        secret: secret,
        token: encryptedValue,
        ttl: 0  // Token lifetime (set to 0 to ignore expiration for now)
    });

    return token.decode();  // Return the decrypted value
} */



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
    if (!navigator.onLine) return;
    
    const curVer = getCookie('db_version');
    const key1 = getCookie('key1');
    console.log("Online. Current DB version:", curVer);
    ajaxUpdateSR(key1, curVer);
}

updateLyrics();

async function checkBookmark(id) {
    try {
        const count = await db.bookmarks.where("lyrics_id").equals(id).count();
        if (count < 1) {
            return null;
        }
        const bookmark = await db.bookmarks.where("lyrics_id").equals(id).first();
        return bookmark ? bookmark.id : null;
    } catch (error) {
        console.error("Dexie error:", error);
        return null;
    }
}

function gAnalytics(nr,sb,event) {
    gtag('event', event, {
        'page_title': "Särlaregn nr. " + nr,
        'page_path': "/" + nr + "" + sb
    });
}

// Toggle chord display
function toggleChords() {
    const showChords = getCookie('showChords');
    const newValue = showChords === '1' ? '0' : '1';
    setCookie('showChords', newValue);
    
    // Reload current song to apply changes
    const urlParams = new URLSearchParams(window.location.search);
    const pathName = window.location.search;
    if (pathName) {
        try {
            const sbnr = pathName.split(",");
            const nSbnr = sbnr[0].replace("?", "");
            createSearchArray(nSbnr, sbnr[1]);
        } catch (e) {
            console.log("Error reloading song: " + e);
        }
    }
}

// Process chords in content
function processChords(content) {
    const showChords = getCookie('showChords');
    
    if (showChords !== '1') {
        // Just remove chords if not showing them
        return content.replace(/\{[^}]*\}/g, '');
    }
    
    // Create temporary div to work with HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Process each verse
    const verses = tempDiv.querySelectorAll('div.pt');
    verses.forEach(verse => {
        // Get all text nodes and process them
        processNodeChords(verse);
    });
    
    return tempDiv.innerHTML;
}

// Recursively process text nodes to add chord bubbles
function processNodeChords(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const chordPattern = /\{([^}]*)\}/g;
        
        // Check if text contains chords without affecting regex state
        if (text.indexOf('{') !== -1) {
            const span = document.createElement('span');
            span.style.position = 'relative';
            
            let lastIndex = 0;
            let match;
            
            while ((match = chordPattern.exec(text)) !== null) {
                // Add text before chord
                if (match.index > lastIndex) {
                    span.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
                }
                
                // Create chord bubble
                const chordBubble = document.createElement('span');
                chordBubble.className = 'chord-bubble';
                let chord = match[1];
                // Normalize chord (uppercase with lowercase 'm')
                chord = chord.replace(/^([a-g])(m?)(.*)$/i, (m, note, minor, rest) => {
                    return note.toUpperCase() + minor.toLowerCase() + rest.toUpperCase();
                });
                chordBubble.textContent = chord;
                span.appendChild(chordBubble);
                
                lastIndex = match.index + match[0].length;
            }
            
            // Add remaining text
            if (lastIndex < text.length) {
                span.appendChild(document.createTextNode(text.substring(lastIndex)));
            }
            
            node.parentNode.replaceChild(span, node);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
        // Process child nodes
        const children = Array.from(node.childNodes);
        children.forEach(child => processNodeChords(child));
    }
}

// Load lyric into div
function getLyric(id) {
    db.lyrics.where("id").equals(id).each(function(item) {
	let content = item.value;
	
	// Process chords (show or hide based on setting)
	content = processChords(content);
	
	// Check if line breaks should be removed
	const noLineBreaks = getCookie('noLineBreaks');
	if (noLineBreaks === '1') {
	    const tempDiv = document.createElement('div');
	    tempDiv.innerHTML = content;
	    const verses = tempDiv.querySelectorAll('div.pt');
	    verses.forEach(verse => {
		let verseHtml = verse.innerHTML;
		verseHtml = verseHtml.replace(/<br\s*\/?>/gi, ' ').replace(/\s{2,}/g, ' ');
		verse.innerHTML = verseHtml;
	    });
	    content = tempDiv.innerHTML;
	}
	
	if (DOM.lyric) DOM.lyric.innerHTML = content;
	if (DOM.sNext) DOM.sNext.href = "javascript:selectNext(" + item.browse + ");";
	if (DOM.sPrev) DOM.sPrev.href = "javascript:selectPrev(" + item.browse + ");";
	
	// Apply saved font size and chord visibility to thelyric element after it's loaded
	const fs = parseFloat(getCookie('FontSize')) || 14;
	const showChords = getCookie('showChords');
	const thelyricElement = document.getElementById('thelyric');
	if (thelyricElement) {
	    thelyricElement.style.fontSize = fs + 'px';
	    
	    if (showChords === '1') {
	        thelyricElement.classList.add('chords-visible');
	    } else {
	        thelyricElement.classList.remove('chords-visible');
	    }
	}
	
	const upt2 = (item.sb == "1" || item.sb == "2") ? "" : "," + b[item.sb];
	history.pushState({}, "", "/?" + item.nr + upt2);
	document.title = "Särlaregn nr. " + item.nr;
	
	const star = item.bookmarked == "true" ? '★' : '☆';
	const action = item.bookmarked == "true" ? 'delete_bookmark' : 'add_bookmark';
	const title = item.bookmarked == "true" ? 'Ta bort bokmärke' : 'Lägg till bokmärke';
	
	const chordIcon = showChords === '1' ? '🎸' : '🎵';
	const chordTitle = showChords === '1' ? 'Dölj ackord' : 'Visa ackord';
	
	const menu1 = `
	    <a href="javascript:${action}('${id}');" style="width:25%;" class="menu-btn menu-btn-small" title="${title}">${star}</a>
	    <a href="javascript:toggleChords();" style="width:25%;" class="menu-btn menu-btn-small" title="${chordTitle}">${chordIcon}</a>
	    <a href="javascript:exportOpenSong('${id}');" style="width:25%;" class="menu-btn menu-btn-small" title="Ladda ner som OpenSong">⬇</a>
	    <a href="javascript:bookmarks()" class="menu-btn menu-btn-small" style="width:25%;" title="Bokmärken">bm</a>
	`;
	if (DOM.bmField) DOM.bmField.innerHTML = menu1;
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



// Zoom with improved pinch gesture
var lastPinchScale = 1;
$(document).ready(function(){
    $( 'body' ).swipe( {
        pinchIn:function(event, scale) {
            var scaleChange = Math.abs(scale - lastPinchScale);
            if (scaleChange > 0.05) {
                changeFontSize(false, 2);
                lastPinchScale = scale;
            }
        },
        pinchOut:function(event, scale) {
            var scaleChange = Math.abs(scale - lastPinchScale);
            if (scaleChange > 0.05) {
                changeFontSize(true, 2);
                lastPinchScale = scale;
            }
        },
        pinchStatus:function(event, phase, direction, distance, duration, fingerCount, pinchZoom) {
            if (phase === 'end') {
                lastPinchScale = 1;
            }
        },
	fingers:2,
	pinchThreshold:0,
	allowPageScroll: 'auto',
	preventDefaultEvents: false
    });
});




// Swipe to next or prev
$(function(){
    $( '#everything' ).swipe( {
        swipeLeft:function(event, direction, distance, duration, fingerCount) { 
            $( '#sNext' )[0].click();
	},
	swipeRight:function(event, direction, distance, duration, fingerCount) {
            $( '#sPrev' )[0].click();
	},
	fingers:1,
	threshold:25
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
        var link = '<p><a href="javascript:delete_bookmark(\'' + bookmark.id + '\', true);" style="color:#d9534f;text-decoration:none;font-weight:bold;margin-right:8px;" title="Ta bort bokmärke">✖</a><a href="javascript:getLyric(\'' + bookmark.id + '\');">' + bookmark.label + '</a></p>';
	bm_list.push(link);
    }).then(function() { 
    menu1 = '<a href="javascript:bookmarks();" style="width:100%;" class="menu-btn">bokmärken</a>'
	$( '#lyric' ).html(bm_list.join(''))
	$( '#bm_field' ).html(menu1);
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
function delete_bookmark(id, fromBookmarksList = false) {
    db.lyrics.update(id, {bookmarked: "false"}).then(function() {
        if (fromBookmarksList) {
            // Reload bookmarks list
            bookmarks();
        } else {
            // Reload current song
            getLyric(id);
        }
    });
}

// Function for loading html page into div 	
function loadPage(page){
    var htmlpage = page + ".html";
    menu1 = '<a href="javascript:bookmarks();" style="width:100%;" class="menu-btn">bm</a>'

    $( '#bm_field' ).html(menu1);
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
			    // Remove chords from label in search results
			    const cleanLabel = item.label.replace(/\{[^}]*\}/g, '');
			    thearray.push({ id : item.id, value : cleanLabel, label : cleanLabel });
			}
		    }
		}).then(function() { 
		    response(thearray); thearray = [];
		}) 
	    } else {
		db.lyrics.where("nr").equals(theSearchLC).each(function(item) {
		    // Remove chords from label in search results
		    const cleanLabel = item.label.replace(/\{[^}]*\}/g, '');
		    thearray.push({ id : item.id, value : cleanLabel, label : cleanLabel });
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

// Note: adjustBodySpacing function is commented out above
// Removed event listeners that reference it to prevent errors
/*
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
*/
