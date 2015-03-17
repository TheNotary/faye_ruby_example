

var audioContext = initializeNewWebAudioContext();
audioContext.loadSound('/audio/bing_153101_2042792-lq.ogg', 'bing');
audioContext.loadSound('/audio/clinks_104815_1657980-lq.ogg', 'clinks');


var chatRoom = function(){}

chatRoom.client_name = '';
chatRoom.admin_name = 'Sales';
chatRoom.power_state = '';
chatRoom.seconds_til_expiration = '';
chatRoom.timers = [];
chatRoom.timers['isRespondingTimers'] = [];

chatRoom.subscribeToRoom = function(room_hash){
	var client = fayeClient;
	var subscription;
	subscription = client.subscribe('/' + room_hash, function(message) {
        // handle message
    	var type = message.type;
    	
    	if (type == 'msg'){
    		chatRoom.handleChatMessage(room_hash, message);
    	}
    	else if (type =='nameChange'){
    		// get out if we started the name change
    		if (myRole == message.role)
    			return;
			else{
				if (typeof(adminChat) != 'undefined'){  // if the client changed the name... The admin must...
					adminChat.applyNameChangeToTab(room_hash, message.speaker);
				}
				else{ // if the admin changed their name...  then the client must...
					chatRoom.applyAdminNameChangeForClient(message.speaker);
				}
			}
    	}
    	else if (type == 'closingSession'){
    		if (myRole == 'admin'){
    			// 1)  set there isResponding value to false...
    			chatRoom.toggleRespondingMessage(room_hash, false);
    			
    			// 2)  Post a message <p>client has navigated away</p>
    			var appendMe = chatRoom.concoctSystemMessageMarkup("*The client has navigated away*");
				chatRoom.plopDownMessageMarkdown(room_hash, appendMe);
    		}
			else{
				return;
			}
    	}
    	else if (type == 'enteredRoom'){
    		// get out if we started the name change
    		if (myRole == message.role)
    			return;
			else{
				chatRoom.noteAdminEntraceForClient(message.speaker);
			}
    	}
    	else if (type == 'anAdminIsHere'){
    		chatRoom.noteAnAdminIsLoggedOnForClient();
    	}
  		else if (type == 'respondingOff' || type == 'respondingOn'){  // set is responding
  			chatRoom.handleRespondingMessage(room_hash, message);
  		}
    });
    if (myRole != "admin"){
    	chatRoom.tellAdminYouEnteredARoom(room_hash);
    }
    return subscription;
}

chatRoom.noteAnAdminIsLoggedOnForClient = function(){
	$('#admins_logged_on').html('At least one <span class="green">sales rep</span> has been identified as <span class="green">logged on</span> =)');
}

chatRoom.noteAdminEntraceForClient = function(speaker){
	chatRoom.admin_name = speaker;// loading_statement
	//$('.chat-msgs').html('<p>You are now speaking with: <span class="green">' + speaker + '</span></p>');
	$('.loading_statement').html('<p>You are now speaking with: <span class="green">' + speaker + '</span></p>');
	$('#admins_logged_on').remove();
}

chatRoom.tellAdminYouEnteredARoom = function(room_hash){
	fayeClient.publish('/data', {type: 'newChat', room_hash: room_hash, speaker: chatRoom.client_name});
}

chatRoom.announceNameChange = function(room_hash, newName){
	var type = 'nameChange';
	var speaker = newName;
	var role = myRole;
	
	fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker});
}


var isResponding = false;

chatRoom.setIsResponding = function(room_hash, trueOrFalse){
	isResponding = trueOrFalse;
	
	chatRoom.transmitRespondingSignal(room_hash, isResponding);
	if (isResponding){
		var contents = chatRoom.getTextareaContents(room_hash);
		if (typeof(chatRoom.timers['isRespondingTimers'][room_hash]) != "undefined"){
			clearInterval(chatRoom.timers['isRespondingTimers'][room_hash]);
			chatRoom.timers['isRespondingTimers'][room_hash] = null;
		}
		
		chatRoom.timers['isRespondingTimers'][room_hash] = chatRoom.spawnNewInterval(room_hash, contents);
	}
}

chatRoom.tmrIsRespondingTimeout = function(room_hash, contents){
	if (chatRoom.contentsChanged(room_hash, contents)){
		// alert("contents changed --" + contents + ": "+ chatRoom.timers['isRespondingTimers'][room_hash]);
		
		clearInterval(chatRoom.timers['isRespondingTimers'][room_hash]);
		chatRoom.timers['isRespondingTimers'][room_hash] = null;
		
		chatRoom.timers['isRespondingTimers'][room_hash] = chatRoom.spawnNewInterval(room_hash, chatRoom.getTextareaContents(room_hash));
	}
	else{  // if contents unchanged
		// alert("contents un-changed --" + contents + ": "+ chatRoom.timers['isRespondingTimers'][room_hash]);
		clearInterval(chatRoom.timers['isRespondingTimers'][room_hash]);
		chatRoom.timers['isRespondingTimers'][room_hash] = null;
		chatRoom.setIsResponding(room_hash, false);
	}
}

chatRoom.contentsChanged = function(room_hash, contents){
	return contents != chatRoom.getTextareaContents(room_hash);
}

chatRoom.spawnNewInterval = function(room_hash, contents){
	return setInterval("chatRoom.tmrIsRespondingTimeout('"+room_hash+"', '" + contents + "')", 5000);
}

chatRoom.cleanUpRelatedTimer = function(){
	
}

chatRoom.getTextareaContents = function(room_hash){
	return $('.chatEncapsulator[data-room_hash=' + room_hash + '] textarea')[0].value;
}

chatRoom.transmitRespondingSignal = function(room_hash, trueOrFalse){
	var type = 'respondingOff';
	if (trueOrFalse)
		type = 'respondingOn';
	var role = myRole;
	var speaker = (role == 'client') ? chatRoom.client_name : chatRoom.admin_name;
	var msg = 'a';
	
	fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker, text: msg});
}

chatRoom.handleChatMessage = function(room_hash, message){
	var type = message.type;
	var role = message.role;
	var msg = decryptMessage(message.text);
	var speaker = message.speaker;
	
	if (type == 'msg')
		chatRoom.putNewMessageInWindow(room_hash, msg, speaker);
	
	if (myRole == 'client' && message.role != myRole)  // make sure the 'motd' is cleared for when the client presses the back button to get back into chatting...
		chatRoom.noteAdminEntraceForClient(message.speaker);
}

chatRoom.handleRespondingMessage = function(room_hash, message){
	var type = message.type;
	var role = message.role;
	
	if (role != myRole){
		if (type == "respondingOn")
			chatRoom.toggleRespondingMessage(room_hash, true);	
		else if (type == 'respondingOff')
			chatRoom.toggleRespondingMessage(room_hash, false);
	}
}

chatRoom.toggleRespondingMessage = function(room_hash, shouldDisplayMessage){
	var userIsTypingDiv = $('.chatEncapsulator[data-room_hash=' + room_hash + '] div .user-is-typing');
	if (shouldDisplayMessage){
		userIsTypingDiv.removeClass('hidden');
	}
	else{
		userIsTypingDiv.addClass('hidden');
	}
}


chatRoom.createNewChatClient = function(){
	var client = new Faye.Client('http://' + chatServer + ':' + chatPort + '/faye', {
      timeout: 120
    });
    client.bind('transport:down', function() {
	  //alert('Warning:  The connection has been lost.' + betaMessage);
	  chatRoom.setStatusToFailed();
	});
	client.bind('transport:up', function() {
	  chatRoom.setStatusToConnected();
	});

    return client;
}


chatRoom.submitMessage = function(frm){
	var textArea = frm.parentElement.children[1];
	var room_hash = frm.parentElement.parentElement.getAttribute('data-room_hash');
	var msg = textArea.value;
	
	if ($.trim(msg) != ""){
		var publication = chatRoom.transmitMessage(room_hash, msg);
		publication.callback(function() {
			textArea.value = "";
			textArea.focus();
		});
		publication.errback(function() {
		  err_could_not_end_msg = 'Your message could not be sent due to some kind of error.'
		  console.log(err_could_not_end_msg);
			alert(err_could_not_end_msg);
		});
	}
}

chatRoom.transmitMessage = function(room_hash, msg){
	var type = 'msg';
	var role = myRole;
	var speaker = (role == 'client') ? chatRoom.client_name : chatRoom.admin_name;
	var msg = encryptMessage(msg);
	
	var publication = fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker, text: msg})
	
	
	
	chatRoom.setIsResponding(room_hash, false);
	
	return publication;
}

chatRoom.putNewMessageInWindow = function(room_hash, msg, speaker){
	
	if (typeof(adminChat) != 'undefined'){
		adminChat.respawnChatWindowIfNeeded(room_hash, speaker);
		adminChat.incrementMissedChatCount(room_hash);
	}
	var x_myName = (myRole == 'client') ? chatRoom.client_name : chatRoom.admin_name;
	var coloring = (speaker == x_myName) ? "you" : "them";
	
	if (coloring == "them") audioContext.playSound('clinks');
	
	var appendMe = chatRoom.concoctChatMessageMarkup(speaker, msg, coloring);
	
	chatRoom.plopDownMessageMarkdown(room_hash, appendMe);
	
	chatRoom.scrollToLatestMessage(room_hash);
}

chatRoom.concoctChatMessageMarkup = function(speaker, msg, coloring){
	var prefix = "<p class='chat-prefix'>" + speaker + ":  </p>";
	var msg_line = "<p class='chat-msg'>" + msg + "</p>";
	var appendMe = '<div class="chat-response ' + coloring + '">' + prefix + msg_line + '</div><div class="clear"></div>';
	return appendMe;
}

chatRoom.concoctSystemMessageMarkup = function(msg){
	var coloring = "system";
	var prefix = "<p class='chat-prefix'>" + "  </p>";
	var msg_line = "<p class='chat-msg'>" + msg + "</p>";
	var appendMe = '<div class="chat-response ' + coloring + '">' + prefix + msg_line + '</div><div class="clear"></div>';
	return appendMe;
}

chatRoom.plopDownMessageMarkdown = function(room_hash, markdown){
	$('.chatEncapsulator[data-room_hash=' + room_hash + '] .chat-msgs').append(markdown);
}

chatRoom.scrollToLatestMessage = function(room_hash){
	$('.chat-msgs').stop();
	$('.chat-msgs').animate({ scrollTop: $('div.chatEncapsulator[data-room_hash=' + room_hash + '] .chat-msgs').prop('scrollHeight')}, 1000);
}


chatRoom.setStatusToConnected = function(){
  console.log('connected');
	$('#chat-status').html('connected');
	$('#chat-status').css('color', 'green');
	if (myRole == "admin"){
		adminInterface.hideRestartFayeButton();
	}
}

chatRoom.setStatusToFailed = function(){
  err_failed_to_connect = 'Error:  failed to connect';
  console.log(err_failed_to_connect);
  
	$('#chat-status').html(err_failed_to_connect);
	$('#chat-status').css('color', 'red');
	alert("We're sorry, our chat servers seem to be down at the moment.");
	if (myRole == "admin"){
		adminInterface.showRestartFayeButton();
	}
}

// returns true if the user is still there, else returns false
chatRoom.sendAreYouStillThereSignal = function(room_hash){
	return false;
}

chatRoom.changeClientName = function(room_hash, name){
	chatRoom.client_name = name;
	chatRoom.announceNameChange(room_hash, name)
}

chatRoom.getRoomHash = function(){
	return $('.chatEncapsulator').attr('data-room_hash');
}

chatRoom.applyAdminNameChangeForClient = function(speaker){
	chatRoom.admin_name = speaker;
}

chatRoom.signalThatClientIsBrowsingAway = function(room_hash){
	var type = 'closingSession';
	var role = myRole;
	var speaker = chatRoom.getMyName();
	
	fayeClient.publish('/' + room_hash, {type: type, role: role, speaker: speaker});
}

chatRoom.queryIfAdminIsConnected = function(room_hash){
	alert('this is a stub');
	// publish to data channel { type: 'isAnnyoneOutThere', room_hash: room_hash }
	//
	// when admin recieves one of these messages, he publishes { type: 'isAnnyoneOutThere' } to that user's room_hash
	//
	// when client recieves this response, the MOTD changes to "1 Admin has been found.  You are encouraged to type a message."
	// End Of Feature
	
}

// returns client_name or admin_name depending on what the role of this instance is...
chatRoom.getMyName = function(){
	return (myRole == 'client') ? chatRoom.client_name : chatRoom.admin_name;
}

function encryptMessage(msg){
	msg = msg.replace("\n", "<br>");
	return $.base64.encode(msg);
}

function decryptMessage(msg){
	return $.base64.decode(msg);
}




// I thought it would be a good idea to create a class for methods that are present on the UI...
// I'm not sure if this is necessary though... Or even that clever...
var chatInterface = function(){}

chatInterface.btnChangeName = function(){
	var isInputDisabled = $("#input-name").attr("disabled") == "disabled";
	var room_hash = chatRoom.getRoomHash();
	
	if (isInputDisabled){
		$("#input-name").attr("disabled", false);
		$("#btn-change-name").html("Change");
	}
	else{
		$("#input-name").attr("disabled", true);
		$("#btn-change-name").html("Modify");
		var name = $('#input-name').attr('value');
		if (myRole == "admin"){
			adminChat.changeAdminName(name);
		}
		else{
			chatRoom.changeClientName(room_hash, name);
		}
	}
}


chatInterface.buildHtml = function(){
  
  
}

function handleKeyUp(e, frm){
	var formsValue = frm.value;
	var room_hash = frm.parentElement.parentElement.getAttribute('data-room_hash');
	
	if (formsValue != ""){
		// send respondingOn, unless we already did that
		if (!isResponding)
			chatRoom.setIsResponding(room_hash, true);
	}
	else{
		if (isResponding)
			chatRoom.setIsResponding(room_hash, false);
	}
}

function handleKeyDown(e, frm){
	if (e.keyCode == 13){   //  && e.ctrlKey  for some reason, when holding ctrl + enter, keycode becomes 10...
		chatRoom.submitMessage(frm);
		e.preventDefault();  // supress enter key's new line
		return false;
	}
}

function checkIfConnectionFailed(){
	if (fayeClient.getState() == "CONNECTING")
		chatRoom.setStatusToFailed();
	else
		chatRoom.setStatusToConnected();
}






