class QueueElement {
    
    constructor(element, priority) {
        this.element = element;
        this.priority = priority;
    }
}

/** Javascript implementation of Priority Queue returning lowest priority first. */
class PriorityQueue {

    constructor() {
        this.queue = [];
    }

    enqueue(element, priority) {
        let item = new QueueElement(element, priority);
        let contain = false;
    
        for (let i = 0; i < this.queue.length; i++) {

            if (this.queue[i].priority > item.priority) {

                this.queue.splice(i, 0, item);
                contain = true;
                break;
            }
        }
    
        if (!contain) {
            this.queue.push(item);
        }
    }

    dequeue() {
        if (this.isEmpty()) {
            throw "Error: No elements in Queue";
        }
        return this.queue.shift();
    }

    front() {
        if (this.isEmpty()) {
            throw "Error: No elements in Queue";
        }
        return this.queue[this.queue.length - 1];
    }

    rear() {
        if (this.isEmpty()) {
            throw "Error: No elements in Queue";
        }
        return this.queue[0];
    }

    isEmpty() {
        return this.queue.length == 0;
    }
}