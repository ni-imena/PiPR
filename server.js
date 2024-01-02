const http = require('http');
const express = require('express');
const sha256 = require("sha256");

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);
var ioc = require( 'socket.io-client' );

const peers = [];

const genBlockInt = 5000;
const fixDiffInt = 5;


class Block{
    constructor(index, timestamp, data, previousHash) {
        this.index = index;
        this.timestamp = timestamp;
        this.data = data;        
        this.previousHash = previousHash;
        this.nonce = 0;
        this.difficulty;
        this.calculateHash();
    }
    calculateHash() {
    //Žeton za enkratno uporabo (nonce) in vrednost težavnosti uporabite pri izračunu zgoščene vrednosti.
    //hash = sha256(index + timestamp + data + previousHash + diff + nonce)
        this.hash = sha256(this.index + 
                            this.timestamp + 
                                this.data + 
                                    this.previousHash + 
                                        this.difficulty + 
                                            this.nonce)
                                                .toString();
    }
    static adjustDifficulty(block, currTime, chain){
        var prevAdjBlock = chain[chain.length - fixDiffInt];
        var timeExpected = genBlockInt*fixDiffInt;
        var timeTaken = block.timestamp - prevAdjBlock.timestamp;

        if(timeTaken< (timeExpected/2)){
            return prevAdjBlock.difficulty + 1;
        }
        else if(timeTaken > (timeExpected*2)){
            return prevAdjBlock.difficulty - 1;
        }
        return prevAdjBlock.difficulty;

    }
    proofOfWork(lastBlock, ts, chain){
        
        while(true){
            this.timestamp = Date.now();
            if(((lastBlock.index+1)%fixDiffInt) == 0) {
                this.difficulty = Block.adjustDifficulty(lastBlock, ts, chain);
            }
            this.calculateHash();
            //console.log(this.hash + "diff" + this.difficulty);
            var diffArr = Array(this.difficulty+1).join('0').toString();
            if (this.hash.substring(0,this.difficulty) == diffArr){
                break;
            }
            else{
                this.nonce++;
            }
        }
    }
}

class Chain{
    constructor(){
        this.blockchain = [this.genesisBlock()];
        this.diff = 4;
        this.blockchain[0].difficulty = this.diff;
    }
    genesisBlock(){
        var genBlock = new Block(0, Date.now(), "block0data", "0");
        genBlock.difficulty = this.diff;
        return genBlock;
    }
    addToChain(block){
        block.previousHash = this.prevBlock().hash;
        this.diff = this.prevBlock().difficulty;
        block.difficulty = this.diff;
        block.proofOfWork(this.prevBlock(), this.prevBlock().timestamp, this.blockchain);
        this.blockchain.push(block);
    }

    prevBlock(){
        return this.blockchain[this.blockchain.length - 1];
    }
    

    validateChain(){
        for(var i = 0; i < this.blockchain.length; i++){
            if(this.blockchain[i].calculateHash !== this.blockchain[i].hash || this.blockchain[i].previousHash  !== this.blockchain[i-1].hash){
                return false;
            }
        }
        return true;
    }

}
let blockchain = new Chain();
let indexN = 1;
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    socket.on('jao', (msg)=>{
        console.log(msg);
    })
    function mineBlock(){
    
        blockchain.addToChain( new Block(indexN, Date.now(), "block" + indexN++ + "data"));
        socket.emit('writeChain', JSON.stringify(blockchain.prevBlock()));
        console.log(JSON.stringify(blockchain.prevBlock())+"\n\n");    
    }
    function sendPeers(chain, peer, diff){
        peer.emit('chain',chain, diff);
        return;
    }
    
    socket.on('port-connect', function(portNumber){
        peers.push(portNumber);
        console.log(peers);

        var peer = ioc.connect( "http://localhost:" + portNumber );
        socket.emit('portN', portNumber);
        peer.once( "connect", function (peerSocket) {
            console.log( 'Peer: Connected to port ' + portNumber );
            peer.emit('connected', server.address().port);
            const intervalPeer = setInterval(() => {
                sendPeers(JSON.stringify(blockchain), peer, blockchain.diff);
            }, 5000);
        })

    })
    
    socket.on('connected', function(data){
        console.log( 'Peer: Connected' + data);
    })

    socket.on('startMine', function(){
        console.log(peers[0])
        blockchain = new Chain();
        socket.emit('writeChain',JSON.stringify(blockchain.prevBlock()));
        indexN = 1;
        const intervalB = setInterval(mineBlock, 1000);
        mineBlock();
    })

    function display(){
        socket.emit('writeChain', JSON.stringify(blockchain));
    }

    socket.on('chain', function(chain, diff){
        console.log("received chain "+ chain);
        let comptChain = new Chain();
        comptChain = JSON.parse(chain);
        
        console.log(comptChain);
        console.log(comptChain.blockchain.length)
        
        if(comptChain.length > blockchain.length){
            blockchain = comptChain;
            const dispInt = setInterval(display(),2000);
        }
        
    })
})

server.listen(0, () => {
    console.log(`http://localhost:${server.address().port}/`);
});