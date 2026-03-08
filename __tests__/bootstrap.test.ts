/**
 * Tests for the bootstrap utility module.
 */
import {
  generateBootstrapScript,
  generateLauncherScript,
  parseBootstrapLog,
  PRCTL_SHIM_SOURCE,
  STEP_LABELS,
  TOTAL_STEPS,
  BOOTSTRAP_LOG,
} from '../src/utils/bootstrap';

describe('bootstrap utilities', () => {
  describe('constants', () => {
    it('has 6 total steps', () => {
      expect(TOTAL_STEPS).toBe(6);
    });

    it('has labels for all steps', () => {
      for (let i = 1; i <= TOTAL_STEPS; i++) {
        expect(STEP_LABELS[i]).toBeDefined();
        expect(typeof STEP_LABELS[i]).toBe('string');
      }
    });

    it('defines the bootstrap log path in Termux home', () => {
      expect(BOOTSTRAP_LOG).toContain('com.termux');
      expect(BOOTSTRAP_LOG).toContain('codex-bootstrap.log');
    });

    it('includes PR_SET_DUMPABLE in the prctl shim source', () => {
      expect(PRCTL_SHIM_SOURCE).toContain('PR_SET_DUMPABLE');
      expect(PRCTL_SHIM_SOURCE).toContain('prctl');
      expect(PRCTL_SHIM_SOURCE).toContain('dlsym');
    });
  });

  describe('generateLauncherScript', () => {
    it('includes the API key', () => {
      const script = generateLauncherScript('sk-test123');
      expect(script).toContain('OPENAI_API_KEY="sk-test123"');
    });

    it('includes the LD_PRELOAD for prctl shim', () => {
      const script = generateLauncherScript('sk-test');
      expect(script).toContain('LD_PRELOAD=/usr/lib/libprctl_shim.so');
    });

    it('starts codex app-server on the correct port', () => {
      const script = generateLauncherScript('sk-test');
      expect(script).toContain('codex app-server --listen ws://127.0.0.1:4500');
    });
  });

  describe('generateBootstrapScript', () => {
    it('generates a valid shell script', () => {
      const script = generateBootstrapScript('sk-test123');
      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('set -e');
    });

    it('includes all 6 steps', () => {
      const script = generateBootstrapScript('sk-test');
      for (let i = 1; i <= TOTAL_STEPS; i++) {
        expect(script).toContain(`log_step ${i}`);
        expect(script).toContain(`log_done ${i}`);
      }
    });

    it('installs proot-distro', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('pkg install -y proot-distro');
    });

    it('installs ubuntu', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('proot-distro install ubuntu');
    });

    it('installs nodejs, git, gcc, python3 inside Ubuntu', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('nodejs');
      expect(script).toContain('git');
      expect(script).toContain('gcc');
      expect(script).toContain('python3');
    });

    it('installs codex CLI via npm', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('npm install -g @openai/codex');
    });

    it('compiles the prctl shim', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('libprctl_shim.so');
      expect(script).toContain('gcc -shared -fPIC');
    });

    it('creates the launcher script', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('start-codex.sh');
    });

    it('writes BOOTSTRAP_COMPLETE marker', () => {
      const script = generateBootstrapScript('sk-test');
      expect(script).toContain('BOOTSTRAP_COMPLETE');
    });
  });

  describe('parseBootstrapLog', () => {
    it('parses an empty log', () => {
      const result = parseBootstrapLog('');
      expect(result.currentStep).toBe(0);
      expect(result.completedSteps).toEqual([]);
      expect(result.error).toBeNull();
      expect(result.isComplete).toBe(false);
    });

    it('parses step progress', () => {
      const log = 'STEP:1\nDONE:1\nSTEP:2\n';
      const result = parseBootstrapLog(log);
      expect(result.currentStep).toBe(2);
      expect(result.completedSteps).toEqual([1]);
      expect(result.isComplete).toBe(false);
    });

    it('parses completed bootstrap', () => {
      const log = 'STEP:1\nDONE:1\nSTEP:2\nDONE:2\nSTEP:3\nDONE:3\nSTEP:4\nDONE:4\nSTEP:5\nDONE:5\nSTEP:6\nDONE:6\nBOOTSTRAP_COMPLETE\n';
      const result = parseBootstrapLog(log);
      expect(result.completedSteps).toEqual([1, 2, 3, 4, 5, 6]);
      expect(result.isComplete).toBe(true);
    });

    it('parses errors', () => {
      const log = 'STEP:1\nDONE:1\nSTEP:2\nERROR:2:Failed to install\n';
      const result = parseBootstrapLog(log);
      expect(result.error).toEqual({ step: 2, message: 'Failed to install' });
    });

    it('handles mixed content with log lines', () => {
      const log = 'Some log output\nSTEP:1\nmore output\nDONE:1\nSTEP:2\n';
      const result = parseBootstrapLog(log);
      expect(result.currentStep).toBe(2);
      expect(result.completedSteps).toEqual([1]);
    });
  });
});
