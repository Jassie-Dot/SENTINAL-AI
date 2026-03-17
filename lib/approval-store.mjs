/**
 * ApprovalStore
 * In-memory approvals keyed by token id.
 * (Electron desktop app scope; if you later add multi-user, persist per-user.)
 */
export class ApprovalStore {
  constructor() {
    this._map = new Map(); // id -> approval
  }

  put(approval) {
    this._map.set(approval.id, approval);
    return approval;
  }

  get(id) {
    const a = this._map.get(id);
    if (!a) return null;
    if (Date.now() > a.expiresAt) {
      this._map.delete(id);
      return null;
    }
    return a;
  }

  consume(id, { sessionId } = {}) {
    const a = this.get(id);
    if (!a) return null;
    if (sessionId && a.sessionId && a.sessionId !== sessionId) return null;
    this._map.delete(id);
    return a;
  }

  cleanup() {
    const now = Date.now();
    for (const [id, a] of this._map.entries()) {
      if (!a || now > a.expiresAt) this._map.delete(id);
    }
  }
}

export default ApprovalStore;
