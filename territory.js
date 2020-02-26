var Territory = function(name, continent) {
    this.name = name;
    this.continent = continent;
    this.owner = null;
    
    // every territory gets 3 troops in the beginning
    this.troops = 3;
};

exports.Territory = Territory;