require 'daemons'

Daemons.run('faye_server.rb')

# might want to do the below from within the rails app to bypass this file...
# Daemons.run('lib/chat_server/faye_server.rb', {:ARGV => ['start']})
# Daemons.run('faye_server.rb', {:ARGV => ['start']})
# Daemons.run('faye_server.rb', {:ARGV => ['stop']})

# This way works from within irb, but it blocks execution, must be run in a proc....
# `bundle exec ruby faye_server.rb start`

# $faye_thread = Thread.new do
#   `bundle exec ruby faye_server.rb start`
# end

# Controller from rails
#  def turn_on_faye_server
#    # response = %x[cd lib/chat_server;bundle]
#    response = %x[cd lib/chat_server;bundle exec ruby faye_control.rb stop]
#    response = %x[cd lib/chat_server;bundle exec ruby faye_control.rb start]
#
#
#    render :text => "done:  #{response}"
#  end

