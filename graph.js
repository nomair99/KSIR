var GraphNode = function(obj) {
    this.obj = obj;
};

var Graph = function(nodes, edges) {
    // creates a new graph data structure
    // [nodes] is an array of GraphNode objects
    // [edges] is an array of pairs of indices into [nodes], each
    // representing an individual edge

    this.nodes = nodes;

    // ? more efficient way to initialize
    // initialize the adjacency matrix
    this.adjacencyMatrix = [];
    for(let i = 0; i < nodes.length; i++) {
        this.adjacencyMatrix.push([]);
        for(let j = 0; j < nodes.length; j++) {
            this.adjacencyMatrix[i].push(false);
        }
    }

    // fill in edges
    for(let k = 0; k < edges.length; k++) {
        this.adjacencyMatrix[edges[k][0]][edges[k][1]] = true;
        this.adjacencyMatrix[edges[k][1]][edges[k][0]] = true;
    }
};

exports.GraphNode = GraphNode;
exports.Graph = Graph;