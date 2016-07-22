import { Socket } from 'phoenix_js';

let socket = new Socket('ws://10.111.3.87:4000/socket');
socket.connect();
socket.onClose(e => console.log('Closed connection'));

var channel = socket.channel('game', {});
channel.join()
  .receive('ok', (response) => console.log('Ok', response))
  .receive('error', () => console.log('Connection error'));

channel.on('pong', message => console.log('On Pong', message));

channel.push('ping')
  .receive('ok', message => console.log('Ping Reply', message));

channel.push({type: 'connect', nickname: 'Chris'});

channel.push('game:state')
  .receive('ok', state => {
    console.log('State', state)
  });
