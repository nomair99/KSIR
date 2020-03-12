var utils = require('./utils.js');

var GameState = function(map, playerList) {
    // class that defines the state of the entire board

    this.map = map;
    this.numPlayers = playerList.length;
    this.playerList = playerList.map((player) => {return {
        player: player,
        alive: true
    }});

    this.reinforcementsRemaining = 0;

    this.currentPlayerIndex = 0;
    this.currentPlayer = playerList[this.currentPlayerIndex].player;
    this.phase = 'reinforcement';

    // TODO generate continents list
    this.continentsList = [];
    for(let i = 0; i < this.map.nodes.length; i++) {
        if(this.continentsList.indexOf(this.map.nodes[i].obj.continent) === -1) {
            // add continent if it does not exist

            this.continentsList.push(this.map.nodes[i].obj.continent);
        }
    }

    // calculate continent bonuses
    this.continentBonuses = new Map();

    for(let m = 0; m < this.continentsList.length; m++) {
        // TODO come up with a better formula
        this.continentBonuses.set(this.continentsList[m], 2);
    }

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
    
    this.switchToNextPlayer = function() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerList.length;
            this.currentPlayer = this.playerList[this.currentPlayerIndex];
        } while(!this.playerList[this.currentPlayerIndex].alive);
    };

    this.moveTroops = function(from, to, num) {
        
        // ? should there be checks here
        this.map.nodes[from].obj.troops -= num;
        this.map.nodes[to].obj.troops += num;
    };
    
    this.killTroops = function(index, num) {
        this.map.nodes[index].obj.troops -= num;
    };

    this.calculatedReinforcements = function(player) {
        // calculate the bonus troops from conquered continents for [player]

        let numOwnedRegions = 0;
        for(let i = 0; i < this.map.nodes.length; i++) {
            if(this.map.nodes[i].obj.owner === player) {
                numOwnedRegions++;
            }
        }

        // do a full traversal to find unconquered continents
        // all other continents are then conquered
        let traversal = this.map.getFullTraversal();
        let next;
        let continentsNotConquered = new Map();
        while(true) {
            next = traversal.next();
            if(next.done) {
                break;
            }

            if(this.map.nodes[next.value].obj.owner !== player) {
                continentsNotConquered.set(this.map.nodes[next.value].obj.continent, true);
            }
        }

        let bonus = 0;
        for(let n = 0; n < this.continentsList.length; n++) {
            if(!continentsNotConquered.has(this.continentsList[n])) {
                bonus += this.continentBonuses.get(this.continentsList[n]);
            }
        }

        return Math.max(3, Math.floor(numOwnedRegions / 3)) + bonus;
    };
};

exports.GameState = GameState;