var Territory = function(name, continent, path) {
    this.name = name;
    this.continent = continent;
    this.path = path;
    this.owner = null;
    
    // every territory gets 3 troops in the beginning
    this.troops = 3;
};

exports.Territory = Territory;