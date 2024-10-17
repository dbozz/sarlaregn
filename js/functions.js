var b = {
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
      newFontSize = currentFontSizeNum * 1.2;
    } else {
      newFontSize = currentFontSizeNum * 0.8;
    }

    $element.css('font-size', newFontSize);
    Cookies.set('FontSize', newFontSize, { 
      expires: 3650 
    });
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
    var originalFontSize = $('html').css('font-size');

    $(".resetFont").click(function () {
        $('html').css('font-size', originalFontSize);
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
//    console.log("Songbook: " + sb);
    if ( sb != undefined ) { 
        // console.log("sb not undefined");
        var bsb = b[sb];
    } else {
        // console.log("sb is undefined");
        var bsb = getBookID(nr);
    } 
    var entries = {};
    db.lyrics.where("nr").equals(nr).each(function (item) {
        // console.log("Iterrating " + item.sb + " and " + item.id);
        entries[item.sb] = item.id;
    }).then(function () {
        getLyric(entries[bsb]);
    }).catch(function (error) {
        console.error("Error in createSearchArray:", error);
    });
}


// Clear LocalStorage and DB
function clearSite() {
    db.delete();
    window.localStorage.clear();
    location.reload();
    //window.applicationCache.update();
}

// IndexedDB functions ------------------------------------------------
var db = new Dexie("SR");
/*db.version(1).stores({
	lyrics: "id, nr, search, ts"
	});
db.version(2).stores({
	lyrics: "id, nr, search, ts",
	bookmarks: "++id, &lyrics_id, excerpt"
	});
db.version(3).stores({
	lyrics: "id, nr, search, ts, sb",
	bookmarks: "++id, &lyrics_id, excerpt"
	});*/
db.version(6).stores( {
    lyrics: "id, nr, search, ts, sb, browse, bookmarked",
    bookmarks: "++id, lyrics_id, excerpt"
});


// Function to populate Indexed DB from sql

function setTimestampCookie(cookieName) {
    var timestamp = Math.floor(Date.now() / 1000);
    var date = new Date();
    date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000)); 
    var expires = "; expires=" + date.toUTCString();
    document.cookie = cookieName + "=" + timestamp + expires + "; path=/; SameSite=None; Secure";
}

function updateDbVersionCookie() {
    var now = Math.floor(Date.now() / 1000);
    console.log('Updating Cookie db_version.')
    fetch('/db_version.json?t=' + now )
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            var version = data.version;
            var date = new Date();
            date.setTime(date.getTime() + (100 * 365 * 24 * 60 * 60 * 1000));  // 100 years
            var expires = "expires=" + date.toUTCString();
            document.cookie = "db_version=" + version + "; " + expires + "; path=/; SameSite=None; Secure";
        })
        .catch(error => {
            console.error('Failed to fetch db_version.json:', error);
        });
}

function ajaxSR(key1) {
    return new Dexie.Promise(function (resolve, reject) {
        $.ajax("/sr.json", {
            type: 'get',
            dataType: 'json',
            error: function (xhr, textStatus) {
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
                // Check if the item has encrypted fields
                if (item.encrypted) {
                    try {
                        // Attempt to decrypt specific fields
                        item.label = decryptField(item.label, key1);  // Decrypt label
                        item.value = decryptField(item.value, key1);  // Decrypt value
                        item.search = decryptField(item.search, key1);  // Decrypt search
                    } catch (error) {
                        // If decryption fails, skip adding this item
                        //console.error("Decryption failed for item:", item, "Error:", error);
                        return;  // Skip to the next item
                    }
                }
                // Add the item to the database after processing
                db.lyrics.add(item);
            });
        });
    }).then(function () {
        //setTimestampCookie('db_version');
        updateDbVersionCookie();
        console.log('Done inserting data into DB.')
        $('#lyric').html("Klart! Du kan nu söka efter sånger i sökfältet längst upp på sidan.");
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
	    $( '#lyric' ).html("Databasen är tom. Laddar ner från särlaregn.se. Vänligen vänta...");
	    var key1 = Cookies.get('key1');
	    ajaxSR(key1);
        }
    });
});


function ajaxUpdateSR(key1, curVer) {
    return new Dexie.Promise(function (resolve, reject) {
        var now = Math.floor(Date.now() / 1000);
        $.ajax("db_version.json?t=" + now, {
            type: 'get',
            dataType: 'json',
            error: function (xhr, textStatus) {
                reject(textStatus);
            },
            success: function (data) {
                resolve(data);
            }
        });
    }).then(function (data) {
        // Assuming db_version.json contains an object like { "version": "unixtimestamp" }
        var newVersion = parseInt(data.version, 10); // Convert the version to an integer (Unix timestamp)
        console.log("Current Online DB version is: " + newVersion)
        if (newVersion > curVer) {
            // The new version is newer than the current version, update the page
            $( '#lyric' ).html('Det finns en ny sångdatabas. <a href="javascript:clearSite();">Klicka här för att uppdatera.</a>');
        }
        // If the new version is not newer, do nothing
    }).catch(function (error) {
        console.log(error);
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

/*function updateLyrics() {
    db.lyrics.orderBy("ts").reverse().limit(1).toArray(function(version) {
        var curVer = version.map(function (v) { return v.ts });
//        console.log ("Browser database version: " + curVer);
        if (navigator.onLine) {
	    console.log("Navigator is online and current downloaded DB version is " + curVer);
	    ajaxUpdateSR(Cookies.get('key1'),curVer);
        }
    });
}*/

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
	$('#thelyric').css('font-size', fs);
	if ( item.sb == "1" || item.sb == "2" ) { var upt2 = ""; } else { var upt2 = "," + b[item.sb]; }
	history.pushState({}, "", "/?" + item.nr + upt2);
//	document.getElementById('urlDisplay').innerHTML = window.location.href;
	document.title = "Särlaregn nr. " + item.nr; //+ " " + item.sb;
        //gAnalytics(item.nr,item.sb,"ViewLyric");
        if(item.bookmarked == "true") {
            $( '#lyric_head').html('<a href=\"javascript:delete_bookmark(\'' + id + '\');\">Ta bort bokmärke</a><br>Kopiera <a href=\"javascript:ttc()\">text</a> | <a href=\"javascript:copyLink()\">länk</a>');
        } else {
            $( '#lyric_head').html('<a href=\"javascript:add_bookmark(\'' + id + '\');\">Lägg till bokmärke</a><br>Kopiera <a href=\"javascript:ttc()\">text</a> | <a href=\"javascript:copyLink()\">länk</a>');
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
	$( '#lyric_head' ).html("");
    }).catch(function (error) {
	console.error(error);
    });
}


// Add bookmark
function add_bookmark(id) {
//    db.lyrics.where("id").equals(id).each(function(item){
        db.lyrics.update(id, {bookmarked: "true"});
//    });
//    console.log("Testar..." + id);
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
    $( '#lyric_head' ).html("");
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
