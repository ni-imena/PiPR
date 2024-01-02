
        console.log(location.port);
        var socket = io();
        socket.emit('jao', location.port);
        socket.on('portN', function(port) { 
            console.log(port);
        })
        
        function diplayBlock(data){
            const div = document.createElement('div');
            div.textContent = data;
            return document.getElementById('ledger-container').append(div);
        }
        socket.on('writeChain', function(data){
            diplayBlock(data);            
        })

        // socket.on('chain', function(data){
        //     console.log("received chain "+ data);
        //     let arr = JSON.parse(data);
        //     console.log(arr);
        //     if(arr.length > blockchain.length){
        //         blockchain = arr;
                
        //         socket.emit('writeChain', JSON.stringify(blockchain));
        //     }
            
        // })

        var portSumbit = document.getElementById("port-button");
        var portInput = document.getElementById("port-input");
        var form = document.getElementById("connPort");
        var startMine = document.getElementById("mine-button");

        startMine.addEventListener("click", function(e) {
            e.preventDefault();
            socket.emit('startMine');
            return;
        })

        form.addEventListener("submit", (e)=>{
            e.preventDefault();
            socket.emit("port-connect", portInput.value);
        })    
