var Territory = require('./territory.js').Territory;

function getMap() {
    // ! dummy get map function that returns the original risk map

    nodes = [];

    nodes.push(new Territory(
        "",
        "",
        "M203 155l18 0c6,0 12,-6 18,-6 0,-6 6,-18 6,-30l0 -84c0,-12 -6,-24 -6,-30 -6,-5 -18,-5 -36,-5l-90 0c-12,0 -18,0 -18,5 -6,6 -6,18 -6,30l0 84c0,12 0,24 6,30 0,0 12,6 36,6l72 0z"
    ));

    nodes.push(new Territory(
        "",
        "",
        
    ));
}