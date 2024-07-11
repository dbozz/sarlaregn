// Font resize function-----------------------------------------------
var changeFontSize = function (increaseFont) {
    var fontTargets = new Array('html', 'p');

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
    });
};

$(document).ready(function () {
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


// IndexedDB functions ------------------------------------------------
var dbSR = $.indexedDB("SR", {
	"schema": {
   	"1": function(versionTransaction){
      	var lyrics = versionTransaction.createObjectStore("lyrics", {
         	"keyPath": "id", autoIncrement: true
         	});
         	lyrics.createIndex("nr");
         	lyrics.createIndex("search");
}}})

var dbABOUT = $.indexedDB( "About", {
	"schema": {
	"1": function(versionTransaction){
	var about = versionTransaction.createObjectStore("about", {
		"keyPath": "timestamp",autoIncrement: false});	
}}})
	
$(document).ready(function () {
	$.get( "/updated.php", function( data ) {
		//$( '#lyric' ).html( data );
		
	});
})

dbSR.done(function(){
	window.setTimeout(function() {
	downloadLyrics();
	}, 200);
	})

function clearDB (table) {
	($.indexedDB("SR").objectStore(table).clear());
}

function deleteDB (){
	$.indexedDB("SR").deleteDatabase();
	$.indexedDB("About").deleteDatabase();
}
	
// Download all lyrics into DB
function downloadLyrics(){
	$.getJSON("sr.json.php", function(data) {
		$.indexedDB("SR").transaction("lyrics").then(function(){
			function(transaction){
				var lyrics = transaction.objectStore("lyrics");
				lyrics.clear();
				$.each(data, function(i){
					(lyrics.add(this));
				});
			}
		});
	});
	$.getJSON( "updated.php", function(timestamp) {
		$.indexedDB("About").transaction("about").then(function(){
			function(transaction){
				var about = transaction.objectStore("about");
				about.clear();
				$.each(timestamp, function(i){
					(about.add(this));
				});
			}
		});
	}); 
}


// Load lyric into div
function getLyric(id) {
	$.indexedDB("SR").objectStore("lyrics").get(id).then(function(item){
		$( '#lyric' ).html(item.value);
	})
}


// Search by text
function searchLyrics(theSearch) {
	//var thesearch = "TALAR om Hur";
	var thesearchLC = theSearch.toLowerCase();
	var i = 0;
	$.indexedDB("SR").objectStore("lyrics").index("search").each(function(item){	
		if (item && i < 10) {
			if (item.value.search.indexOf(thesearchLC) !== -1) {
				i++;				
				console.log("Nr: " + i + " Found a result: " + item.value.label);
			}
		}
	}).fail(function(error, event){
		console.log("Fel! ", error, event);
		$( '#lyric' ).html(error, event);
});
}


// Search by number
	

	
	
	
// Autocomplete function -----------------------------------------------
$(function() {
	var thearray = new Array();
	$( "#sok" ).autocomplete({
		minLength: 1,
		source: function( request, response ) {
			var theSearchLC = request.term.toLowerCase();
				var i = 0;
				if($.isNumeric(theSearchLC) == false) { 				
				$.indexedDB("SR").objectStore("lyrics").index("search").each(function(item){	
					if (item && i < 10) {
						if (item.value.search.indexOf(theSearchLC) !== -1) {
							i++;				
							thearray.push({ id : item.value.id, value : item.value.label, label : item.value.label });
							//console.log(item.value.label);						
						}
					}
				}).done(function() { response(thearray); thearray = [];} )}
				else {
					$.indexedDB("SR").objectStore("lyrics").index("nr").each(function(item){	
					if (item && i < 10) {
						if (item.value.nr == theSearchLC) {
							i++;				
							thearray.push({ id : item.value.id, value : item.value.label, label : item.value.label });
							//console.log(item.value.label);						
						}
					}
				}).done(function() { response(thearray); thearray = [];} )}
		},
		select: function( event, ui ) {
			getLyric(ui.item.id);
			document.activeElement.value='';	
			document.activeElement.blur();
		}
	});
});
