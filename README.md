## About

Faye allows you to send messages back and forth between a server and client.  
Conventionally, data is requested from a client and then the server responds.  
But with Faye's websockets, data can be sent down to a client without the need for the client to request it.  

This is an example demo for working with the old version of faye (0.8.6) that's able to use the #listen method.  


## Starting it in the Ruby World

    $  bundle
    # Start the server component
    $  ruby faye_server.rb
    # Start the ruby client component
    $  ruby client_noise_maker.rb
    # Choose 2 to subscribe to all channels
    # Choose 3 to send a message
    # you will see the json of the message the client sent


## Working with faye from the browser world



## Starting it in the node.js World

Haven't done this yet.

