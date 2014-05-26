//console.log('called');

var extensionName = 'page-inspector';

var iFrame = document.createElement('iframe');
iFrame.src = 'chrome-extension://'+chrome.runtime.id+'/extension.html';

iFrame.id = extensionName;
document.getElementsByTagName('html')[0].appendChild(iFrame);

//Article.js

var debug = true;

var regexps = {
  	invalidCandidates: /and|article|body|column|combx|comment|disqus|foot|html|header|main|menu|meta|nav|rss|shoutbox|sidebar|sponsor/i,
  	blockLevelElements: /<(a|blockquote|dl|div|img|ol|p|pre|table|ul)/i,
  	replaceBrsRe: /(<br[^>]*>[ \n\r\t]*){2,}/gi,
  	replaceFontsRe: /<(\/?)font[^>]*>/gi,
	trimRe: /^\s+|\s+$/g,
 	normalizeRe: /\s{2,}/g,
 	killBreaksRe: /(<br\s*\/?>(\s|&nbsp;?)*){1,}/g,
	videoRe: /http:\/\/(www\.)?(youtube|vimeo|youku|tudou|56|yinyuetai)\.com/i
};

window.isArticle = false;

//Page Inspector
var pi = {
	init: function(){
		//Wrap and clone the DOM to manipulate/search
		window.nodes = this.nodes = $('body').clone();

		//console.log('nodes.length before');
		//console.log(nodes.find('*').length);

		//Clean up scripts, stylesheets and unwanted elements
		//nodes.find('br').remove();
		nodes.find('script').remove();
		nodes.find('link[rel="stylesheet"]').remove();
		nodes.find('and,article,body,column,combx,comment,disqus,foot,html,header,main,menu,meta,nav,rss,shoutbox,sidebar,sponsor');
		nodes.html(nodes.html().replace(regexps.replaceBrsRe, '</p><p>'));
		////console.log(nodes);

		//console.log(nodes.find('p').length);

		//Replace wrongly used divs with <p>
		// nodes.find('div').each(function(index){
			
		// 	var node = $(this);
		// 	if(node.html().search(regexps.blockLevelElements) !== -1){
		// 		//console.log('entered');
		// 		nodes.append($('<p>').text(node.text()));
		// 		node.addClass('article-remove-me');
		// 	}
		// });
		//nodes.find('.article-remove-me').remove();


		//Filter Top 20 <p> Candidates based on text length
		//var candidates = pi.getLongestCandidates();
		var candidates = nodes;
		var parentCandidates = [];

		//console.log('top 20 candidates');
		////console.log(candidates);

		//Now add scores to Top 20
		candidates.find('p').each(function(index){
			var candidate = $(this);
			//var linkDensity = pi.getLinkDensity(candidate);

			////console.log('linkDensity', linkDensity);

			var score;

			//if(linkDensity < 0.2){ //We consider a valid article will have link density of less than 20%
				score =  candidate.text().replace(/\s+/g, " ").length;
				score +=  pi.getPunctuationScore(candidate);

			//}else{
				//score =  candidate.text().length * (1 - linkDensity) * -1;
			//}
			if(candidate.parent()[0].score){
				candidate.parent()[0].score += score;	
			}else{
				candidate.parent()[0].score = score;	
			}

			//console.log('score', score);
			
			candidate.parent().addClass('article-candidate');
			////console.log(candidate.parent()[0].score);

		});

		window.topCandidate = null;

		window.finalCandidates = [];
		nodes.find('.article-candidate').each(function(index){
			var candidate = $(this);
			finalCandidates.push(candidate[0].score);
			////console.log('top candidate score ->'+candidate[0].score);
			if(!topCandidate || candidate[0].score > topCandidate[0].score){
				topCandidate = candidate;
			}
		});

		nodes.find(topCandidate).removeClass('article-candidate');
		window.runnerUpCandidate = null;
		nodes.find('.article-candidate').each(function(index){
			var candidate = $(this);
			////console.log('top candidate score ->'+candidate[0].score);
			if(!runnerUpCandidate || candidate[0].score > runnerUpCandidate[0].score){
				runnerUpCandidate = candidate;
			}
		});

		if(topCandidate && runnerUpCandidate){
			var pLength = topCandidate.find('p').length;
			var textLength = topCandidate.text().replace(/\s+/g, " ").length;
			var linkDensity = pi.getLinkDensity(topCandidate);

			var finalScore = pLength * textLength * (1 - linkDensity);

			//console.log('finalScore');
			//console.log(finalScore);

			if(finalScore > 1000){ //Check if candidates score is higher than base
				//console.log('topCandidate');
				//console.log(topCandidate);

				var diffMargin = 100 - (runnerUpCandidate[0].score / topCandidate[0].score *100);

				if(diffMargin > 35){ //Check if the candidate's score is atleast 35% more than the runner-ups.
					isArticle = true;
				}

				//console.log('diffMargin');
				//console.log(diffMargin);

			}else{
				isArticle = false;
			}
			
			setTimeout(function(){
				console.log('isArticle', isArticle);
				$('html').addClass('show-extension');
				var result = '';
				if(isArticle){result = 'article';}else{result = 'hub';}
				//$('#'+extensionName).
				
				//console.log($('#'+extensionName).contents());
				
				//window.postMessage('hii', window.location);
				
				chrome.runtime.sendMessage(result);
				
			}, 300);

		}else{
			//console.log('no candidate');
			isArticle = false;
		}
		
		

		
	},
	getLongestCandidates: function(){
		var nodes = this.nodes;
		var topCandidates = [];
		
		for(var i = 0; i < 20; i++){
			var candidate;
			var maxLength = 30; //Length has to be atleast 30 characters
			nodes.find('p').each(function(index){
				var node = $(this);
				node.text(node.text().replace(/\s+/g, " "));
				var text = node.text();
				if(text.length > maxLength){
					candidate = node;
					maxLength = node.text().length;
				}
			});
			topCandidates.push(candidate);
			nodes.find(candidate).remove();
		}

		return topCandidates;
	},

	getLinkDensity: function(candidate){
		var totalLength = candidate.text().replace(/\s+/g, " ").length;
		var linkLength = candidate.find('a').text().replace(/\s+/g, " ").length;

		return linkLength / totalLength;
	},

	getTextParentDensity: function(candidate){
		var parentLength = candidate.parent().text().replace(/\s+/g, " ").length;
		var candidateLength = candidate.text().replace(/\s+/g, " ").length;

		return candidateLength / parentLength;
	},

	getPunctuationScore: function(candidate){
		//console.log(candidate);
		var score = candidate.text().replace('.', ',').split(',').length * 5;
		return score;
	}

};

$(document).ready(function(){
	pi.init();
});
