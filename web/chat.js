
function getUniqueChatroomSessionId(){
	var sessionId;
	
	var parameter = getURLParameter('room_hash');
	if (parameter == "null"){
		sessionId = $.cookie('room_hash');
	}
	else{
		sessionId = parameter;
	}
	
	return sessionId;
}

function checkThatSessionIsUnqiue(){
}

function channelPullingLoop(sessionId){
	//  URL:  "/real_time_interaction/getData?sessonId=" + sessionId + "&lastSuccessfulPull=" + lastSuccessfulPull
	var newData = getNewMessagesFromAjaxFeed(sessionId);
}

function plopDownNewMessage(jmsg){
	if (jmsg.length == 0){
		// do nothing if it's an empty json msg
	}
	else{
		for (var i = 0; i < jmsg.length; i++){
			record = jmsg[i]["chat_message"];
			msg = record.msg;
			try{
				msg = decryptMessage(msg);
			}
			catch(err){ 
				alert('failed to decrypt:  ' + err);
			}
			var prefix = "<span class='chat-prefix'>Them:  </span>";
			
			$('#chat-msgs').append("<p>" + prefix + msg + "</p>");
			lastSuccessfulPull = record.created_at;
		}
		scrollToLatestMessage();
	}
}

function getNewMessagesFromAjaxFeed(sessionId){
	$.ajaxSetup({ async: true });
	
	var urn = "/real_time_interaction/get_data?room_hash=" + sessionId + "&last_successful_pull=" + lastSuccessfulPull;
	
	var jqxhr = $.ajax( urn )
    .fail(function() { alert("Error sending ajax request.  Our servers might be having problems.  EGETTING"); })
    .success(function() { plopDownNewMessage(JSON.parse(jqxhr.responseText)); })
}












function transmitMessage(sessionId, msg){
	msg = encryptMessage(msg);
	// http://localhost:3000/real_time_interaction/put_data?room_hash=67d25e660c68ac53010f96d23ad643691653ccbf&msg=hey%20there%20you
	$.ajaxSetup({ async: false });
	
	var urn = "/real_time_interaction/put_data?room_hash=" + sessionId + "&msg=" + msg;  // I need to say whether it's admin page or not...
	
	var jqxhr = $.ajax( urn )
    .fail(function() { alert("Error sending ajax request.  Our servers might be having problems.  ESENDING"); })
    .success(function() {  })
}

function handleKeyPress(e, frm){
	var msg = frm.value;
	if (e.keyCode == 13){
		transmitMessage(uniqueChatroomSessionId, msg);
		frm.value = "";
	}
}

function encryptMessage(msg){
	return $.base64.encode(msg);
}

function decryptMessage(msg){
	return $.base64.decode(msg);
}

function getURLParameter(name) {
    return decodeURI(
        (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search)||[,null])[1]
    );
}





function scrollToLatestMessage(){
	$("#chat-msgs").animate({ scrollTop: $('#chat-msgs').height()}, 1000);
}



var uniqueChatroomSessionId;
var lastSuccessfulPull = "";
uniqueChatroomSessionId = getUniqueChatroomSessionId();

checkThatSessionIsUnqiue();

setInterval("channelPullingLoop('" + uniqueChatroomSessionId + "')", 1000);
