console.log('extension.js');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	$('#page-type').addClass(message);
	  
 });
 

