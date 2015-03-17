require 'rubygems'
require 'bundler/setup'

require 'faye'
require 'pry'  # keep this off for production or it won't start due to pry being a dev dependency...
require 'mysql'
require 'yaml'

bayeux = Faye::RackAdapter.new(:mount => '/faye', :timeout => 25)

class DatabaseStuff
  def setup
    file_path = File.dirname(__FILE__)
    
    # You need to pick which of your rails servers to write to, dev or production
    rails_environment = `hostname`.chomp == "name_of_dev_server" ? 'development' : 'production' 
    
    database_file = YAML::load( File.open( "#{file_path}/../../config/database.yml" ) )
    database = database_file[rails_environment]['database']
    user = database_file[rails_environment]['username']
    pass = database_file[rails_environment]['password']
    
    @db = Mysql.new('localhost', user, pass, database)
  end
  
  # speaker = 0 means admin, 1 means customer
  def record_message(room_hash, is_admin, msg, admin_name, speaker)
    create_chatroom(room_hash, admin_name, 'client_name')
    
    begin
      the_time = Time.now-Time.zone_offset('CST')
      insert_new_msg = @db.prepare "INSERT INTO chat_messages (room_hash, chat_user_id, msg, speaker, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      #binding.pry
      insert_new_msg.execute room_hash, is_admin, msg, speaker, the_time, the_time
    
      insert_new_msg.close
    ensure
      #@db.close
    end
  end
  
  # create the room if it doesn't already exist
  def create_chatroom(room_hash, admin_name, client_name)
    unless room_exists?(room_hash)
      create_room(room_hash, admin_name, client_name)
    end
  end
  
  
  # read the databas and see to it that room_hash exists
  def room_exists?(room_hash)
    begin
      statement = @db.prepare "SELECT EXISTS(SELECT * FROM chat_rooms WHERE room_hash = ?)"
      statement.execute room_hash
      result = statement.fetch.first
      statement.close
    ensure
      #@db.close
    end
      return true if result == 1
      false
  end
  
  def create_room(room_hash, admin_name, client_name)
    begin
      the_time = Time.now-Time.zone_offset('CST')
      insert_new_chatroom = @db.prepare "INSERT INTO chat_rooms (room_hash, admin_name, client_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      insert_new_chatroom.execute room_hash, admin_name, client_name, the_time, the_time
    
      insert_new_chatroom.close
    ensure
      #@db.close
    end
  end
  
  def rename_client(room_hash, client_name)
    begin
      the_time = Time.now-Time.zone_offset('CST')
      update_client_name = @db.prepare "UPDATE chat_rooms SET client_name = ? WHERE room_hash = ?"
      update_client_name.execute client_name, room_hash
      
      update_client_name.close
    ensure
      # @db.close
    end
  end
  
  def close
    @db.close
  end
end




class ServerAuth
  def incoming(message, callback)
    # Let non-subscribe messages through
    return callback.call(message) unless message['channel'] == '/meta/subscribe'
    
    return callback.call(message) unless message['subscription'] == '/data' || message['subscription'] == '/*' || message['subscription'] == '/**'
    
    
    # Get subscribed channel and auth token
    subscription = message['subscription']
    msg_token    = message['ext'] && message['ext']['authToken']  # How do I pin this to the message as I'm subscribing from js ???

    token    = "secret"

    # Add an error if the tokens don't match
    if token != msg_token
      invalid_pass_msg = 'Invalid subscription auth token recieved'
      puts invalid_pass_msg 
      message['error'] = invalid_pass_msg
    else
      puts "Valid auth token received"
    end
    
    # Call the server back now we're done
    callback.call(message)
  end
end

class MessageStorage
  def incoming(message, callback)
    unless message['data'] && message['data']['type'] == 'msg'
      return callback.call(message)
    end
    
    puts message
    #binding.pry
    room_hash = message["channel"][1..-1]
    is_admin = (message["data"]["role"] == "admin") ? 0 : 1
    msg = message["data"]["text"]
    admin_name = "Default Admin"
    client_name = "Client"
    speaker = message["data"]["speaker"]
    
    db = DatabaseStuff.new
    db.setup
    
    db.record_message(room_hash, is_admin, msg, admin_name, speaker)
    
    db.close
    
    callback.call(message)
  end
end

class NameChanging
  def incoming(message, callback)
    unless message['data'] && message['data']['type'] == 'nameChange'
      return callback.call(message)
    end
    
    puts message
    
    room_hash = message["channel"][1..-1]
    speaker = message["data"]["speaker"]
    
    db = DatabaseStuff.new
    db.setup
    db.rename_client(room_hash, speaker)
    db.close
    
    callback.call(message)
  end
end

bayeux.add_extension(ServerAuth.new)
# bayeux.add_extension(MessageStorage.new)
# bayeux.add_extension(NameChanging.new)




bayeux.listen(9292)
