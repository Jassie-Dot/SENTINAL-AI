import crypto from 'crypto';

/**
 * PolicyEngine
 * Central guardrails for any action that can touch the host system.
 *
 * Design goals:
 * - Default-deny for high-risk categories (power, arbitrary commands, "hacking").
 * - Explicit, time-bound approvals for sensitive actions.
 * - Human-readable reasons for allow/deny.
 */
export class PolicyEngine {
  constructor(options = {}) {
    this.approvalTtlMs = Number(options.approvalTtlMs ?? 2 * 60_000); // 2 minutes
    this.maxCommandLen = Number(options.maxCommandLen ?? 4000);
    this.blockedKeywords = new Set([
      // explicit offensive/harmful
      'ddos', 'loic', 'botnet', 'payload', 'exploit', 'metasploit', 'ransomware',
      'keylogger', 'stealer', 'credential', 'phish', 'phishing', 'backdoor',
      // destructive system ops
      'format', 'diskpart', 'cipher /w', 'bcdedit', 'reg delete', 'shutdown /s', 'rm -rf',
    ]);
  }

  /**
   * Classify an action into a risk category.
   * Keep it simple and conservative: if unsure, treat as sensitive.
   */
  classify({ toolName, toolInput }) {
    const name = String(toolName || '').toLowerCase();
    const input = String(toolInput || '').toLowerCase();

    // Offensive / hacking intent (blocked)
    if (
      name.includes('hacking') ||
      name.includes('cyber') && (input.includes('illegal') || input.includes('exploit') || input.includes('payload')) ||
      /(^|\b)(ddos|loic|exploit|payload|crack|bypass|illegal mode)(\b|$)/i.test(input)
    ) {
      return { category: 'blocked.offensive', sensitivity: 'blocked' };
    }

    // Power actions
    if (/shutdown|restart|reboot|lock|log off|sign out/i.test(input)) {
      return { category: 'system.power', sensitivity: 'approval' };
    }

    // Arbitrary command execution
    if (name.includes('system-control') || /powershell|run command|execute|cmd\.exe/i.test(input)) {
      return { category: 'system.exec', sensitivity: 'approval' };
    }

    // Network recon (allowed but controlled)
    if (/nmap|scan ports|scan wifi|scan local/i.test(input) || name.includes('network-audit')) {
      return { category: 'security.defensive', sensitivity: 'allow' };
    }

    return { category: 'general', sensitivity: 'allow' };
  }

  isBlockedByKeyword(text) {
    const t = String(text || '').toLowerCase();
    for (const kw of this.blockedKeywords) {
      if (t.includes(kw)) return kw;
    }
    return null;
  }

  /**
   * Create an approval token for an action. Caller should present it to user.
   */
  mintApproval({ sessionId, category, toolName, toolInput }) {
    const id = crypto.randomBytes(9).toString('base64url'); // short, copyable
    const now = Date.now();
    return {
      id,
      sessionId,
      category,
      toolName,
      toolInput,
      createdAt: now,
      expiresAt: now + this.approvalTtlMs,
    };
  }

  /**
   * Decide whether a tool execution is permitted.
   * Returns { allowed, requiresApproval, blocked, reason, category }
   */
  evaluate({ toolName, toolInput }) {
    const input = String(toolInput ?? '');
    if (input.length > this.maxCommandLen) {
      return { allowed: false, blocked: true, reason: 'Input too long', category: 'blocked.validation' };
    }

    const kw = this.isBlockedByKeyword(input);
    if (kw) {
      return { allowed: false, blocked: true, reason: `Blocked keyword: ${kw}`, category: 'blocked.keyword' };
    }

    const { category, sensitivity } = this.classify({ toolName, toolInput: input });

    if (sensitivity === 'blocked') {
      return { allowed: false, blocked: true, reason: 'Blocked category', category };
    }
    if (sensitivity === 'approval') {
      return { allowed: false, requiresApproval: true, reason: 'Approval required', category };
    }
    return { allowed: true, category };
  }
}

export default PolicyEngine;
