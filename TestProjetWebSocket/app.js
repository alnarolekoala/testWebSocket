const { Socket } = require('socket.io');

const express = require('express');

const app = express();
const http = require('http').createServer(app);
const path = require('path');
const port = 3000;

/**
 * @type {Socket}
 */
const io = require('socket.io')(http);
// on précise que notre app pourra utiliser bootstrap et jquery
app.use('/bootstrap/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));
app.use('/bootstrap/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/jquery', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
// on dit a notre app que nos dossier js et css sont dans public 
app.use(express.static('public'));
// si l'url de l'user est localhost:3000/ on lui envoie l'index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates/index.html'));
});
// si l'url de l'user est localhost:3000/games/tic-tac-toe on lui envoie tic-tac-toe.html.
app.get('/games/tic-tac-toe', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates/games/tic-tac-toe.html'));
});
// le serveur écoute sur le port défini plus haut
http.listen(port, () => {
    // au démarrage du serveur on affiche sur quel port il est lancé
    console.log(`Listening on http://localhost:${port}/`);
});
// on déclare un tableau de room
let rooms = [];
// quand il y a une connection, donc une arrivé sur tic-tac-toe.html
io.on('connection', (socket) => {
    console.log(`[connection] ${socket.id}`);
// on écoute si on a recu les données du joueur via un socket.emit('playerData', player); coté client
    socket.on('playerData', (player) => {
        console.log(`[playerData] ${player.username}`);
        // on déclare une variable dans laquelle on pourra stocker une room
        let room = null;
        // si le joueur n'as pas de roomId
        if (!player.roomId) {
            // on crée une room avec en parametre le player qui sera l'hote de la room
            room = createRoom(player);
            console.log(`[create room ] - ${room.id} - ${player.username}`);
        } else {
            // sinon on attribue l'idroom du player a notre room
            room = rooms.find(r => r.id === player.roomId);
            // si on a pas de room 
            if (room === undefined) {
                return;
            }
            // on attribue l'id de la room au roomId du player
            player.roomId = room.id;
            // on ajoute notre joueur aux joueurs de la room
            room.players.push(player);
        }
        // on rejoin la room avec l'id de la room en parametre 
        socket.join(room.id);
        // on envoie au client l'id de la room via l'evenement join room 
        io.to(socket.id).emit('join room', room.id);
        // si il y a 2 joueurs dans la room 
        if (room.players.length === 2) {
            // on envoie au client, les joueurs dans la room via l'evenement start game
            io.to(room.id).emit('start game', room.players);
        }
    });
    // on écoute si il y un emit sur  l'evenement get rooms
    socket.on('get rooms', () => {
        // si il y'a un emit on renvoie au client, la liste des rooms disponible, et non pleine
        io.to(socket.id).emit('list rooms', rooms);
    });
    // on écoute si ya un emit sur l'evenement play avec en parametre player
    socket.on('play', (player) => {
        
        console.log(`[play] ${player.username}`);
        // si il en a un on renvoi au client, via l'evnement play le player
        io.to(player.roomId).emit('play', player);
    });
    // on écoute si il y a un emit play again avec en parametre l'id de la room 
    socket.on('play again', (roomId) => {
        
        const room = rooms.find(r => r.id === roomId);
        // si il y a une room id et 2 joueur dedans

        if (room && room.players.length === 2) {
            
            io.to(room.id).emit('play again', room.players);
        }
    })
    // quand il y  une déconnexion, (quitter la page tic-tac-toe)
    socket.on('disconnect', () => {

        console.log(`[disconnect] ${socket.id}`);
        let room = null;
        // pour chaque room dans notre roomList
        rooms.forEach(r => {
            // pour chaque joueur dans les joueurs présent dans la room 
            r.players.forEach(p => {
                // si le socketId du joueur est égale au socketid actuel et qu'il est l'hote de la room
                if (p.socketId === socket.id && p.host) {

                    room = r;
                    // on garde uniquement les room qui ne sont pas celle actuel, supression de la room
                    rooms = rooms.filter(r => r !== room);
                }
            })
        })
    });
});
// fonction qui créer les room avec en parametre l'objet player qui sera l'hote
function createRoom(player) {
    // on crée une room avec un id et une liste de joueur
    const room = { id: roomId(), players: [] };
    // on assigne au joueur qui crée la room la roomId
    player.roomId = room.id;
    // on ajoute au joueur de notre room le joueur 
    room.players.push(player);
    // on ajoute notre room a notre list de room
    rooms.push(room);
    // retourne la room fraichement créer
    return room;
}

function roomId() {
    // génére un id random pour l'id de la room.
    return Math.random().toString(36).substr(2, 9);
}