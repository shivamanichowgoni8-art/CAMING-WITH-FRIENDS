// Event-Driven Multiplayer Synchronization & Authoritative Host Conflict Resolution
// Manages deterministic event sequencing, dropped-packet detection, and late-join snapshots.

export const EVENT_TYPES = {
  CHOP: 'CHOP',
  PLANT: 'PLANT',
  PICKUP: 'PICKUP',
  CRAFT: 'CRAFT',
  PLACE: 'PLACE',
  REMOVE: 'REMOVE',
  CATCH_FISH: 'CATCH_FISH',
  ADD_LOG: 'ADD_LOG',
  USE_TOOL: 'USE_TOOL',
  CHEST_TRANSFER: 'CHEST_TRANSFER',
  DOOR_TOGGLE: 'DOOR_TOGGLE',
  CAMPFIRE_EXTINGUISH: 'CAMPFIRE_EXTINGUISH'
};

export class EventSyncManager {
  constructor({ isHost, peerId, network, onApplyEvent, getSnapshotData, onApplySnapshot }) {
    this.isHost = isHost;
    this.myPeerId = peerId;
    this.network = network;
    this.onApplyEvent = onApplyEvent; // Callback when an event is confirmed and executed locally
    this.getSnapshotData = getSnapshotData; // Host callback to gather current world state
    this.onApplySnapshot = onApplySnapshot; // Client callback to hydrate world state

    // Event sequence numbers
    this.hostSeq = 0;
    this.lastSeenSeq = 0;

    // Host authoritative event history (circular buffer for rapid resync)
    this.eventHistory = [];
    this.maxHistory = 200;

    // Out-of-order packet queue for clients
    this.pendingOutOfOrder = new Map(); // seq -> eventPacket

    // Pending client transactions awaiting host confirmation
    this.pendingTransactions = new Map(); // txId -> { event, resolve, reject, timestamp }

    this.setupNetworkHandlers();
  }

  setupNetworkHandlers() {
    if (!this.network) return;

    // 1. Host authoritative request validation handler
    this.network.onEventRequest = (senderPeerId, data) => {
      if (!this.isHost) return;
      this.handleHostEventRequest(senderPeerId, data);
    };

    // 2. Client confirmed event handler
    this.network.onEventConfirmed = (senderPeerId, data) => {
      this.handleEventConfirmed(data);
    };

    // 3. Client rejected event handler
    this.network.onEventRejected = (senderPeerId, data) => {
      this.handleEventRejected(data);
    };

    // 4. Late-join snapshot receiver
    this.network.onSnapshotSync = (senderPeerId, snapshot) => {
      this.handleSnapshotSync(snapshot);
    };

    // 5. Gap resync request handler
    this.network.onResyncRequest = (senderPeerId, { fromSeq, toSeq }) => {
      if (!this.isHost) return;
      this.handleResyncRequest(senderPeerId, fromSeq, toSeq);
    };
  }

  // Generate unique client transaction ID
  generateTxId() {
    return `${this.myPeerId || 'local'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  // ---------------------------------------------------------------------------
  // DISPATCHING EVENTS
  // ---------------------------------------------------------------------------
  // Clients request an event; Host validates and assigns sequential seq number
  dispatch(type, payload = {}) {
    const txId = this.generateTxId();
    const event = { type, payload, txId, senderId: this.myPeerId, time: Date.now() };

    return new Promise((resolve, reject) => {
      if (this.isHost) {
        // Host directly validates and confirms its own event
        const validation = this.validateEvent(event);
        if (validation.valid) {
          const confirmed = this.confirmAndBroadcast(event);
          resolve(confirmed);
        } else {
          console.warn(`[EventSync] Host rejected local event ${type}:`, validation.reason);
          reject(new Error(validation.reason || 'Event validation failed'));
        }
      } else {
        // Client registers transaction and sends request to host
        this.pendingTransactions.set(txId, { event, resolve, reject, timestamp: Date.now() });

        // Set timeout to avoid hanging transactions if packet drops
        setTimeout(() => {
          if (this.pendingTransactions.has(txId)) {
            console.warn(`[EventSync] Transaction ${txId} timed out waiting for host confirmation.`);
            this.pendingTransactions.delete(txId);
            reject(new Error('Event request timed out'));
          }
        }, 6000);

        this.network.broadcast({
          type: 'event_request',
          event
        });
      }
    });
  }

  // ---------------------------------------------------------------------------
  // HOST AUTHORITY & CONFLICT RESOLUTION
  // ---------------------------------------------------------------------------
  handleHostEventRequest(senderPeerId, { event }) {
    if (!event || !event.txId) return;

    const validation = this.validateEvent(event);
    if (validation.valid) {
      // Event valid: increment sequence and broadcast confirmation to all peers
      this.confirmAndBroadcast(event);
    } else {
      // Event conflict / invalid: notify sender that event was rejected
      console.warn(`[EventSync] Conflict detected for peer ${senderPeerId} on ${event.type}: ${validation.reason}`);
      this.network.sendToPeer(senderPeerId, {
        type: 'event_rejected',
        txId: event.txId,
        reason: validation.reason
      });
    }
  }

  // Host validation logic for conflict resolution
  validateEvent(event) {
    if (!this.getSnapshotData) return { valid: true };
    const worldState = this.getSnapshotData();

    switch (event.type) {
      case EVENT_TYPES.CHOP: {
        const { treeId } = event.payload;
        if (!worldState.trees) return { valid: true };
        const tree = worldState.trees.find(t => t.id === treeId);
        if (!tree) return { valid: false, reason: 'Tree does not exist' };
        if (tree.isChopped) return { valid: false, reason: 'Tree already felled by another camper' };
        return { valid: true };
      }

      case EVENT_TYPES.PLACE: {
        const { gridPos } = event.payload;
        if (!worldState.placedBlocks || !gridPos) return { valid: true };
        // Check if cell is already occupied by a block
        const occupied = worldState.placedBlocks.some(
          b => b.x === gridPos.x && b.y === gridPos.y && b.z === gridPos.z
        );
        if (occupied) return { valid: false, reason: 'Grid cell already occupied' };
        return { valid: true };
      }

      case EVENT_TYPES.REMOVE: {
        const { gridPos } = event.payload;
        if (!worldState.placedBlocks || !gridPos) return { valid: true };
        const exists = worldState.placedBlocks.some(
          b => b.x === gridPos.x && b.y === gridPos.y && b.z === gridPos.z
        );
        if (!exists) return { valid: false, reason: 'No structure at specified cell' };
        return { valid: true };
      }

      case EVENT_TYPES.PICKUP: {
        const { itemId } = event.payload;
        if (!worldState.droppedLogs) return { valid: true };
        const exists = worldState.droppedLogs.some(l => l.id === itemId);
        if (!exists) return { valid: false, reason: 'Item already picked up by another camper' };
        return { valid: true };
      }

      default:
        return { valid: true };
    }
  }

  // Host confirms, numbers, stores, and broadcasts
  confirmAndBroadcast(event) {
    this.hostSeq++;
    const confirmedEvent = {
      seq: this.hostSeq,
      event
    };

    // Store in circular history buffer for resyncing dropped packets
    this.eventHistory.push(confirmedEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // Broadcast confirmed event to all connected peers
    this.network.broadcast({
      type: 'event_confirmed',
      seq: this.hostSeq,
      event
    });

    // Apply locally on host
    this.applyEvent(confirmedEvent);

    return confirmedEvent;
  }

  // ---------------------------------------------------------------------------
  // RECEIVING CONFIRMED EVENTS & SEQUENCE ORDERING
  // ---------------------------------------------------------------------------
  handleEventConfirmed(data) {
    const { seq, event } = data;
    if (!seq || !event) return;

    // Check if this fulfills a local pending transaction
    if (event.txId && this.pendingTransactions.has(event.txId)) {
      const tx = this.pendingTransactions.get(event.txId);
      tx.resolve(data);
      this.pendingTransactions.delete(event.txId);
    }

    // Check sequence ordering
    if (seq <= this.lastSeenSeq) {
      // Duplicate or old packet, ignore
      return;
    }

    if (seq === this.lastSeenSeq + 1) {
      // In-order execution
      this.applyEvent(data);
      this.processPendingOutOfOrder();
    } else {
      // Sequence gap detected! (e.g. expected 5, got 7)
      console.warn(`[EventSync] Sequence gap detected! Expected ${this.lastSeenSeq + 1}, got ${seq}. Requesting resync...`);
      this.pendingOutOfOrder.set(seq, data);

      // Request missing sequence slice from host
      if (!this.isHost && this.network) {
        this.network.broadcast({
          type: 'resync_request',
          fromSeq: this.lastSeenSeq + 1,
          toSeq: seq - 1
        });
      }
    }
  }

  processPendingOutOfOrder() {
    let nextExpected = this.lastSeenSeq + 1;
    while (this.pendingOutOfOrder.has(nextExpected)) {
      const queuedData = this.pendingOutOfOrder.get(nextExpected);
      this.pendingOutOfOrder.delete(nextExpected);
      this.applyEvent(queuedData);
      nextExpected = this.lastSeenSeq + 1;
    }
  }

  applyEvent(confirmedEvent) {
    this.lastSeenSeq = confirmedEvent.seq;
    if (this.onApplyEvent) {
      this.onApplyEvent(confirmedEvent.event, confirmedEvent.seq);
    }
  }

  handleEventRejected({ txId, reason }) {
    if (txId && this.pendingTransactions.has(txId)) {
      const tx = this.pendingTransactions.get(txId);
      tx.reject(new Error(reason || 'Action rejected by host'));
      this.pendingTransactions.delete(txId);
    }
  }

  // ---------------------------------------------------------------------------
  // RESYNC FOR DROPPED PACKETS
  // ---------------------------------------------------------------------------
  handleResyncRequest(senderPeerId, fromSeq, toSeq) {
    if (!this.isHost) return;
    const missing = this.eventHistory.filter(e => e.seq >= fromSeq && e.seq <= toSeq);
    missing.forEach(eventData => {
      this.network.sendToPeer(senderPeerId, {
        type: 'event_confirmed',
        seq: eventData.seq,
        event: eventData.event
      });
    });
  }

  // ---------------------------------------------------------------------------
  // COMPACT LATE-JOIN SNAPSHOT
  // ---------------------------------------------------------------------------
  // Host creates compact snapshot representation
  createSnapshot() {
    if (!this.getSnapshotData) return null;
    const state = this.getSnapshotData();

    return {
      version: 1,
      seed: state.seed || 1337,
      worldTime: state.worldTime || 0,
      lastSeq: this.hostSeq,
      trees: (state.trees || []).map(t => ({
        id: t.id,
        health: t.health,
        isChopped: t.isChopped,
        stage: t.stage || 'mature',
        respawnTimer: Math.ceil(t.respawnTimer || 0)
      })),
      placedBlocks: (state.placedBlocks || []).map(b => ({
        type: b.type,
        x: b.x,
        y: b.y,
        z: b.z,
        rot: b.rot || 0
      })),
      fishStock: state.fishStock !== undefined ? state.fishStock : 14,
      fireFuel: state.fireFuel !== undefined ? parseFloat(state.fireFuel.toFixed(2)) : 1.0,
      chest: state.chest || [],
      cabinDoorOpen: state.cabinDoorOpen || false
    };
  }

  // Client hydrates state from compact snapshot
  handleSnapshotSync(snapshot) {
    if (!snapshot) return;
    console.log(`[EventSync] Hydrating world state from host snapshot (seq: ${snapshot.lastSeq}, seed: ${snapshot.seed})`);
    this.lastSeenSeq = snapshot.lastSeq || 0;
    this.hostSeq = snapshot.lastSeq || 0;
    this.pendingOutOfOrder.clear();

    if (this.onApplySnapshot) {
      this.onApplySnapshot(snapshot);
    }
  }
}
