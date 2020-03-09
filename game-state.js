var utils = require('./utils.js');

var GameState = function(map, playerList) {
    // class that defines the state of the entire board

    this.map = map;
    this.numPlayers = playerList.length;

    this.killTroops = function(index, num) {
        this.map.nodes[index].obj.troops -= num;
    };

    this.moveTroops = function(from, to, num) {

        // ? should there be checks here
        this.map.nodes[from].obj.troops -= num;
        this.map.nodes[to].obj.troops += num;
    };

    this.divideRegions = function() {
        let numRegions = this.map.nodes.length;
        
        let regionsLeft = [];
        let regionsEach = Math.floor(numRegions / this.numPlayers);
        for(let i = 0; i < this.numPlayers; i++) {
            regionsLeft.push(regionsEach);
        }

        // assign the remaining regions to the players
        // whose turns come last
        let remainder = numRegions % this.numPlayers;
        for(let j = 0; j < remainder; j++) {
            regionsLeft[this.numPlayers - 1 - j]++;
        }

        // TODO test
        let traversal = this.map.getFullTraversal();
        let next, playersLeft, chosenPlayer;

        while(true) {
            next = traversal.next();
            if(next.done) {
                break;
            }

            playersLeft = [];
            for(let k = 0; k < this.numPlayers; k++) {
                if(regionsLeft[k] > 0) {
                    playersLeft.push(k);
                }
            }

            chosenPlayer = utils.choice(playersLeft);
            this.map.nodes[next.value].obj.owner = playerList[chosenPlayer];
            regionsLeft[chosenPlayer]--;
        }
    };
};

exports.GameState = GameState;