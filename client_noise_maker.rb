require 'rubygems'
require 'bundler/setup'

require 'faye'
require 'eventmachine'
require 'pry'

$auth_token = "secret"
$client = ""
$last_msg = ""
$c_msgs = 0

def main_loop
  EM.defer do
    while true do
      system "clear"

      print_variables
      print_options

      STDOUT.flush  
      option = gets.chomp 
      perform_operation(option)
    end
  end
end

def print_variables
    puts "** VARIABLES **"
    puts " Auth Token: #{$auth_token}"
    puts " Subscribed Channels: #{$client.instance_eval('@channels.keys')}"
    puts " Last Message: #{$last_msg}"
    puts " Number of Msgs Recieved so Far: #{$c_msgs}"
    puts
end

def print_options
    puts "**MENU**"
    puts " 1.  Set auth token (Use \"secret\")"
    puts " 2.  Attempt subscription to all channels"
    puts " 3.  Send a message"
    puts " 4.  Binding.pry"
    puts " 5.  About"
    puts " 6.  Exit"
    puts
end

def gui_set_auth_token
  system "clear"
  puts "Please input auth token ('secret' should work):"

  STDOUT.flush  
  $auth_token = gets.chomp 
end

def gui_sub_all
  system "clear"

  puts "Subscribing to all channels"
  subscribe_to_all

  puts "... done"
  gets
end

def gui_send_msg
  system "clear"

  
  puts "sending message..."

  $client.publish('/lkasjdA', 'text' => "LOUD NOISES", moreData: "make_this_font_huge")

  gets
end

def gui_pry
  binding.pry
end

def gui_about
  system "clear"

  puts "This app shows you how you can subscribe to a running server,"
  puts "Authenticate to it (pass the correct token)"
  puts "and send and view messages (subscribe to a channel and then publish to it)"
  puts "If you've never used pub/sub systems before, it might feel a bit awkward at first,"
  puts "Luckily there's this command line app to break it down into steps for you."
  puts
  puts "At the menu, first subscribe to all channels."
  puts "Then send a message... you should see some json on the screen, that is"
  puts "the message you sent to the server coming back to this client and then being puts on screen"
  puts
  puts "changing the auth token prevents you from creating new subscriptions to the server."
  puts
  puts "press enter"

  gets


end

def perform_operation(option)
  case option.to_i
  when 1; gui_set_auth_token
  when 2; gui_sub_all
  when 3; gui_send_msg
  when 4; gui_pry
  when 5; gui_about
  when 6; exit
  end
end


def pub_to_channel_every_5_seconds
  EM.add_periodic_timer(5) do
    puts "started"
    $client.publish('/lkasjdA', 'text' => "I MAKE NOISE!", authToken: "secret")
    puts "ended"
  end
end


def subscribe_to_all
  EM.defer do
    res = $client.subscribe('/**') do |message|
      $c_msgs += 1
      $last_msg = message.inspect
      puts message.inspect
    end
  end
end


# Faye Extensions
class ClientAuth
  def outgoing(message, callback)
    # Again, leave non-subscribe messages alone
    unless message['channel'] == '/meta/subscribe'
      return callback.call(message)
    end

    # Add ext field if it's not present
    message['ext'] ||= {}

    # Set the auth token
    message['ext']['authToken'] = $auth_token

    # Carry on and send the message to the server
    callback.call(message)
  end
end



EM.run do
  port = 9292
  $client = Faye::Client.new("http://localhost:#{port}/faye")
  $client.add_extension(ClientAuth.new) 

  #pub_to_channel_every_5_seconds

  #subscribe_to_all

  main_loop
end

