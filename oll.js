var OrderedLinkedListNode = function(obj, next=null) {
    /* Node object for the singly linked list. Each node points to the next node in the list. */
    this.obj = obj;
    this.next = next;
}

var OrderedLinkedList = function(eqFuncObj, eqFunc, gtFuncObj, gtFunc) {
    /* An ordered, singly linked list. */

    // ? can we have a race condition in list operations, as
    // ? multiple users might modify the list at once 

    this.head = null;
    this.eqFuncObj = eqFuncObj;
    this.eqFunc = eqFunc;
    this.gtFunc = gtFunc;
    this.gtFuncObj = gtFuncObj;
    // eqFunc and gtFunc return true if the first object passed to them
    // is equal or greater than the second, respectively. They are used
    // to generalize the list for any type of object.

    this.insert = function(obj) {
        /* Inserts a new node into the list, containing object [obj]. */
        
        let newNode = new OrderedLinkedListNode(obj);
        
        let walk = this.head;
        let walkPrev = null;
        // stores the node before [walk]

        while(walk) {
            if(!this.gtFuncObj(obj, walk.obj)) {
                break;
            }
            walkPrev = walk;
            walk = walk.next;
        }

        if(walkPrev) {
            walkPrev.next = newNode;
        } else {
            // insert node at head
            this.head = newNode;
        }

        newNode.next = walk;
    };

    this.search = function(key) {
        /* 
        Searches for [key] in the list, using [eqFunc].
        Returns the found object, or returns null if it wasn't found.
        */

        // ? will we only search a list in one way
        
        let walk = this.head;
        while(walk) {
            if(this.eqFunc(key, walk.obj)) {
                return walk;
            } else if(this.gtFunc(key, walk.obj)) {
                walk = walk.next;
            } else {

                // if all remaining objects are larger than the
                // one we are searching for, quit
                break;
            }
        }

        return null;
    };

    this.delete = function(key) {
        /*
        Removes the node which matches [key] from the list and returns it.
        Returns null if no such node was found.
        */

        let nodeToDelete = this.search(key);
        if(nodeToDelete) {
            let walk = this.head;
            let walkPrev = null;
            while(walk) {
                if(walk === nodeToDelete) {
                    if(walkPrev) {
                        walkPrev.next = walk.next;
                    } else {
                        // if the deleted node was the head, set the new head
                        this.head = walk.next;
                    }
                }

                walkPrev = walk;
                walk = walk.next;
            }

            return nodeToDelete;
        }

        return null;
    };
}

exports.OrderedLinkedListNode = OrderedLinkedListNode;
exports.OrderedLinkedList = OrderedLinkedList;