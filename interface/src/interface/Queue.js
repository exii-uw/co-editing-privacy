/*

Queue.js

A function to represent a queue

Created by Kate Morley - http://code.iamkate.com/ - and released under the terms
of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

*/

/* Creates a new queue. A queue is a first-in-first-out (FIFO) data structure -
 * items are added to the end of the queue and removed from the front.
 */

const Queue = () => {
  // initialise the queue and offset
  var queue  = [];
  var offset = 0;

  return {
    getLength() {
      return (queue.length - offset);
    },
    isEmpty() {
      return (queue.length == 0);
    },
    enqueue(item){
      queue.push(item);
    },
    dequeue(){

      // if the queue is empty, return immediately
      if (queue.length == 0) return undefined;
  
      // store the item at the front of the queue
      var item = queue[offset];
  
      // increment the offset and remove the free space if necessary
      if (++ offset * 2 >= queue.length){
        queue  = queue.slice(offset);
        offset = 0;
      }
  
      // return the dequeued item
      return item;
  
    },
    peek(){
      return (queue.length > 0 ? queue[offset] : undefined);
    },
  };


}

export default Queue;
