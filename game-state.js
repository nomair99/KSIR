var GameState = function(map) {
    // class that defines the state of the entire board

    this.map = map;

    this.killTroops = function(index, num) {
        this.map.nodes[index].obj.troops -= num;
    };

    this.moveTroops = function(from, to, num) {

        // ? should there be checks here
        this.map.nodes[from].obj.troops -= num;
        this.map.nodes[to].obj.troops += num;
    };
};

exports.GameState = GameState;