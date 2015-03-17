jQuery.fn.slideLeftHide = function( speed, callback ) { this.animate( { width: "hide", paddingLeft: "hide", paddingRight: "hide", marginLeft: "hide", marginRight: "hide" }, speed, callback ); }
jQuery.fn.slideLeftShow = function( speed, callback ) { this.animate( { width: "show", paddingLeft: "show", paddingRight: "show", marginLeft: "show", marginRight: "show" }, speed, callback ); }





var adminChat = function(){}

adminChat.chatTimers = [];

function Client(room_hash, speaker) {
	this.room_hash = room_hash;
	this.speaker = speaker;
}

adminChat.clients = new Array();   // array for holding details about the clients


adminChat.switchRoom = function(e){
	var room_hash = e.getAttribute("data-room_hash");
	adminChat.switchTabs(room_hash);
	adminChat.switchMessages(room_hash);
	if (adminChat.clients[room_hash] != undefined){
		chatRoom.client_name = adminChat.clients[room_hash].speaker;
	}  
	else{
		chatRoom.client_name = ''; // ignore if we click the empty tab...
	}	
}

adminChat.switchTabs = function(room_hash){
	$('.chat-tabs li').removeClass("active");
	var newActiveTab = $('a[data-room_hash="' + room_hash + '"]').parent();
	newActiveTab.addClass('active');
	adminChat.clearUpdatedChatCounts(room_hash);
	
	if ( newActiveTab.hasClass('un-claimed') ){
		newActiveTab.removeClass("un-claimed");
		adminChat.signalAdminHasEnteredRoom(room_hash);
	}
}

adminChat.switchMessages = function (room_hash){
	adminChat.clearCurrentlyDisplayedMessageWindow();
	
	adminChat.displayProperWindow(room_hash);
}

adminChat.signalAdminHasEnteredRoom = function(room_hash){
	var type = 'enteredRoom';
	var speaker = chatRoom.admin_name;
	var role = myRole;
	
	fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker});
}

adminChat.clearCurrentlyDisplayedMessageWindow = function(){
	$('.chatShowing').removeClass('chatShowing');
}

adminChat.displayProperWindow = function(room_hash){
	var properWindow = adminChat.getEncapsulatorElementByRoomHash(room_hash);
	properWindow.addClass('chatShowing');
}

var global = 'no def';

adminChat.clearUpdatedChatCounts = function(room_hash) {
	var missedChatSpan = $('a[data-room_hash="' + room_hash + '"] span.badge');
	if (missedChatSpan.html() != '0'){  // check if there have been missed chats before running routine
		missedChatSpan.html('0');
		missedChatSpan.removeClass('badge-important');
		var theCloseBtn = missedChatSpan.parent().children('button');
		theCloseBtn.css('display', 'none'); // gotta hide this or it will jump around
		missedChatSpan.slideLeftHide(500, function(){
			theCloseBtn.slideLeftShow(500);
		});
	}
}

adminChat.incrementMissedChatCount = function(room_hash) {
	if ( room_hash == undefined ) //  debugging...
		room_hash = 'lkasjdB';
	
	var parent = $('a[data-room_hash="' + room_hash + '"]').parent();
	var isThisTabFocused = parent.hasClass('active');
	
	if ( !isThisTabFocused ){  // if the tab is already focused, don't do anything, they see the new msgs
		var missedChatSpan = $('a[data-room_hash="' + room_hash + '"] span.badge');
		var numberMissed = parseInt(missedChatSpan.html());
		numberMissed++;
		missedChatSpan.html(numberMissed);
		
		missedChatSpan.addClass('badge-important');
		missedChatSpan.removeClass('hidden');
		missedChatSpan.slideLeftShow();
	}
}

adminChat.subscribeToDataChannel = function(){
	var client = fayeClient;
	var secret = token;

	client.addExtension({
	  outgoing: function(message, callback) {
	    message.ext = message.ext || {};
	    message.ext.authToken = secret;
	    callback(message);
	  }
	});
	
	var subscription;
	subscription = client.subscribe('/data', function(message) {
        // handle messages
    	
    	var type = message.type;
    	
    	switch(type){
		case 'newChat':
			adminChat.handleNewChat(message);
    		break;
		case 'powerStateChanged':
    		adminChat.handlePowerStateChange(message);
    		break;
		case 'chatConsoleHit':
			adminChat.handleChatConsoleHit(message);
			break;
    	}
    	
    });
    return subscription;
}

adminChat.handleChatConsoleHit = function(message){
	// show the visitors console
	// write a <p> to it, indicating IP address, user Agent
}

adminChat.handleNewChat = function(message){
	adminChat.tellClientThatAtleastOneAdminIsLoggedOn(message.room_hash);
	
	if (adminChat.doesTabExists(message.room_hash)){
		return;  // we already did this one, don't spawn a duplicate tab
	}
	adminChat.spawnNewChatEncapsulator(message.room_hash, message.speaker);
	chatSubscriptions[message.room_hash] = chatRoom.subscribeToRoom(message.room_hash);
	// get data where it needs to be
	adminChat.clients[message.room_hash] = new Client(message.room_hash, message.speaker);
}

adminChat.handlePowerStateChange = function(message){
	switch(message.msg == 1 ? true : false){
	case true:
		// reset the deadman switch timer
		adminChat.setReminderForWhenChatSessionTimesOut(2*60*60);
		// set power UI state to on
		adminInterface.changeChatPowerStateUI(true);
		break;
	case false:
		// set power UI state to off
		adminInterface.changeChatPowerStateUI(false);
		// clear the deadman switch timer
		clearInterval(adminChat.chatTimers['deadManSwitchReminder']);
		break;
	}
}

adminChat.tellClientThatAtleastOneAdminIsLoggedOn = function(room_hash){
	fayeClient.publish('/' + room_hash, {type: 'anAdminIsHere'});
}

adminChat.doesTabExists = function(room_hash){
	return adminChat.getTabElementByRoomHash(room_hash).length != 0;
}

adminChat.respawnChatWindowIfNeeded = function(room_hash, speaker){
	var tabExists = adminChat.doesTabExists(room_hash);
	if (!tabExists){
		adminChat.spawnNewChatEncapsulator(room_hash, speaker);
	}
}

adminChat.spawnNewChatEncapsulator = function(room_hash, speaker){
	audioContext.playSound('bing');
	adminChat.chatTimers['un-claimedClientNoise'] = setInterval("adminChat.playPingSoundWhileUnclaimedClientsAreThere()", 10000);
	adminChat.spawnNewTab(room_hash, speaker);
	adminChat.spawnNewEncapsulator(room_hash, speaker);
}

adminChat.playPingSoundWhileUnclaimedClientsAreThere = function(){
	if ($(".un-claimed").length == 0){
		clearInterval(adminChat.chatTimers['un-claimedClientNoise']);
		return;
	}
	audioContext.playSound('bing');
}



adminChat.spawnNewTab = function(room_hash, speaker){
	var tabMarkup = "<li class='un-claimed'><a href='#' onclick='javascript:adminChat.switchRoom(this);' data-room_hash='" + room_hash + "'>";
	tabMarkup += "<span class='speaker'>" + speaker + "</span>";
	tabMarkup += "<button class='close btn-tab-close' onclick='adminChat.closeTab(event, this);'>&times;</button>";
	tabMarkup += " <span class='badge badge-important hidden'>0</span>  </a></li>";
	$(".chat-tabs").append(tabMarkup);
}

adminChat.spawnNewEncapsulator = function(room_hash, speaker){
	var tabMarkup;
	tabMarkup =  "<div class='chatEncapsulator adminChat' data-room_hash='" + room_hash + "'>";
	tabMarkup += "  <div class='chat-msgs'>";
	tabMarkup += "  </div>";
	
	tabMarkup += "  <div class='chatConsole'>";
	tabMarkup += "    <div class='user-is-typing hidden'>User Is Typing...</div>";
	tabMarkup += "    <textarea class='real_time_interaction_msg' name='real_time_interaction[msg]' onkeyup='handleKeyUp(event, this)' onkeydown='handleKeyDown(event,this)'></textarea>";
	tabMarkup += "    <button class='btn-custom btn-send' onclick='chatRoom.submitMessage(this)'>Submit <br>(enter)</button>";
	tabMarkup += "  </div>";
	
	tabMarkup += "</div>";

	
	$(".chatroom-encapsulator").append(tabMarkup);
}

adminChat.applyNameChangeToTab = function(room_hash, newName){
	var tab = $('ul.chat-tabs li a[data-room_hash=' + room_hash + '] span.speaker');
	tab.html(newName);
	adminChat.clients[room_hash].speaker = newName;
	chatRoom.client_name = newName;
}


adminChat.closeTab = function(e, element){
	var parentTab = element.parentElement.parentElement;
	var room_hash = parentTab.firstChild.attributes['data-room_hash'].textContent;
	var isUserStillConnected = chatRoom.sendAreYouStillThereSignal(room_hash);
	var leftTab = parentTab.previousElementSibling;
	
	if (!isUserStillConnected){
		//var reallyCloseTab = confirm('Hide chat log for this user?');
		var reallyCloseTab = true;
		
		if (reallyCloseTab){
			// 1)  Remove chatEncapsulator from DOM
			adminChat.despawnEncapsulator(room_hash);
			// 2)  Remove tab from DOM
			adminChat.despawnTab(parentTab);
			// 3)  set tab on left to active
			adminChat.changeActiveTabToLeft(leftTab);
		}
	}
	
}


adminChat.despawnTab = function(parentTab){
	parentTab.parentElement.removeChild(parentTab);
}

adminChat.despawnEncapsulator = function(room_hash){
	var encapsulator = adminChat.getEncapsulatorElementByRoomHash(room_hash)[0];
	encapsulator.parentElement.removeChild(encapsulator);
}

adminChat.changeActiveTabToLeft = function(element){
	setTimeout(function(){ 
		element.firstElementChild.click();
	}, 1);  // this is glitchy cause I can't figure out how to prevent default action for clicking on the tab itself...
}

adminChat.getEncapsulatorElementByRoomHash = function(room_hash){
	return $('.chatEncapsulator[data-room_hash=' + room_hash + ']');
}

adminChat.getTabElementByRoomHash = function(room_hash){
	return $('ul.chat-tabs li a[data-room_hash=' + room_hash + ']');
}

adminChat.changeAdminName = function(name){
	chatRoom.admin_name = name;
	adminChat.adminNameChange(name);
}

adminChat.adminNameChange = function(name){
	// loop through all room_hashes that are registered
	// via tabs...
	var tabs = $('.chat-tabs li a');
	for (var i=1; i<tabs.length;i++){   // skips that first empty tab...
		var element = tabs[i];
		var room_hash = element.dataset.room_hash;
		adminChat.announceNameChangeToClient(room_hash);
	}
}

adminChat.announceNameChangeToClient = function(room_hash){
	var type = 'nameChange';
	var speaker = newName;
	var role = myRole;
	
	fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker});
}

adminChat.toggleChatState = function(){
	adminChat.turnChatOnOff(!chatRoom.power_state);
}

adminChat.turnChatOnOff = function(onOff){
	var param = onOff ? 'on' : 'off';
	$.ajaxSetup({ async: false });
	
	var urn = "/data/chat_power_state?state=" + param;
	
	var jqxhr = $.ajax( urn )
    .fail(function() { alert("Error sending ajax request.  Our servers might be having problems.  ESENDINGfi"); })
    .success(function() { 
    	adminInterface.changeChatPowerStateUI(onOff);
	});
}

adminChat.resetFayeServer = function(){
	$.ajaxSetup({ async: false });
	
	var urn = "/real_time_interaction/turn_on_faye_server";
	
	var jqxhr = $.ajax( urn )
		.fail(function() { alert("Something bad happened....")})
		.success(function() {
			chatRoom.setStatusToConnected();
		});
}

adminChat.setReminderForWhenChatSessionTimesOut = function(secondsLeft){
	var msLeft = secondsLeft * 1000;

	clearInterval(adminChat.chatTimers['deadManSwitchReminder']);
	adminChat.chatTimers['deadManSwitchReminder'] = setInterval(function(){
		adminChat.chatSessionTimedOut();
	}, msLeft);
}

adminChat.chatSessionTimedOut = function(){
	clearInterval(adminChat.chatTimers['deadManSwitchReminder']);
	
	chatRoom.power_state = false;
	adminInterface.changeChatPowerStateUI(false);
	audioContext.playSound('bing');
	
	// var beTrue = confirm('The chat invitation deadman switch has been thrown!  \nReenable the chat invitations?');
	alert('The chat invitation deadman switch has been thrown!  \nReenable the chat invitations?');
	
	// TODO:  Fix this code so it doesn't rely on confirm and instead using an html div that is displayed
	/*
	if (beTrue){
		// signal to rails that you want to turn chat on...
		adminChat.turnChatOnOff(true);
		adminInterface.changeChatPowerStateUI(true);
		
		chatRoom.seconds_til_expiration = 2*60*60;
		// setTimeout for this reminder
		adminChat.setReminderForWhenChatSessionTimesOut(chatRoom.seconds_til_expiration);
	}
	*/
}



var adminInterface = function(){}

adminInterface.txtNameText_keyPress = function(e, frm){
	var keyCode = e.keyCode;
	if (keyCode == 13){  // enter key
		adminInterface.btnNameChange();
	}
}

adminInterface.changeChatPowerStateUI = function(onOff){
	chatRoom.power_state = onOff;
	$('#chat_state').html(onOff ? ' on' : ' off');
	$('#chat_state').removeClass();
	if (onOff)
		$('#chat_state').addClass('green');
	else
		$('#chat_state').addClass('red');
	
	$('#btnChatState').html(!onOff ? ' on' : ' off');
}


adminInterface.showRestartFayeButton = function(){
	$('#btnRestartFaye').removeClass('hidden');
}

adminInterface.hideRestartFayeButton = function(){
	$('#btnRestartFaye').addClass('hidden');
}

adminInterface.btnRestartFaye = function(){
	adminChat.resetFayeServer();
}
