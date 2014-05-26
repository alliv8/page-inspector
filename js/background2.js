chrome.runtime.onMessage.addListener(message);

console.log('background running');

function message(msg, sender, respond){
	console.log(msg);
	console.log(sender);
	console.log(respond);
	
	chrome.tabs.sendMessage(sender.tab.id, msg);
}