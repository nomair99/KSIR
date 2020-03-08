var QueueNode = function(obj) {
    this.obj = obj;
    this.behind = null;
};

var Queue = function() {
    this.head = null;
    this.tail = null;

    this.enqueue = function(obj) {
        let node = new QueueNode(obj);

        // ? does this work
        if(!this.tail) {
            // queue is empty

            this.head = node;
            this.tail = node;
        } else {
            this.tail.behind = node;
            this.tail = node;
        }
    };

    this.dequeue = function() {
        if(this.head) {
            this.head = this.head.behind;
            if(!this.head) {
                // the queue is empty now
                this.tail = null;
            }
        }
    };
};

exports.QueueNode = QueueNode;
exports.Queue = Queue;