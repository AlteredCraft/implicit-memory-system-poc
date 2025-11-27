/**
 * AsyncEventQueue - A simple synchronous event queue for streaming events
 * from callback contexts to async generators.
 *
 * This queue allows callbacks (which cannot yield) to enqueue events that
 * can then be synchronously drained in an async generator context.
 */

export class AsyncEventQueue<T> {
  private queue: T[] = [];
  private closed = false;

  /**
   * Synchronously enqueue an item. Safe to call from callbacks.
   * @param item The item to enqueue
   * @throws Error if the queue has been closed
   */
  enqueue(item: T): void {
    if (this.closed) {
      throw new Error('Cannot enqueue to closed queue');
    }
    this.queue.push(item);
  }

  /**
   * Synchronously drain all queued items. Non-blocking.
   * Returns a generator that yields all current items in FIFO order.
   */
  *drain(): Generator<T, void, undefined> {
    while (this.queue.length > 0) {
      yield this.queue.shift()!;
    }
  }

  /**
   * Check if the queue has any pending events
   */
  hasEvents(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Clear all pending events without draining them.
   * Useful for resetting state between sessions.
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Close the queue, preventing new enqueues.
   * Existing items can still be drained.
   */
  close(): void {
    this.closed = true;
  }

  /**
   * Get the current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}
