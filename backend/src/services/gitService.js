const path = require("path");
const fs = require("fs");

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/workspace";

// Lazy-load simple-git so missing dep doesn't crash startup
let git = null;

function getGit() {
  if (git) return git;
  try {
    const simpleGit = require("simple-git");
    git = simpleGit(WORKSPACE_ROOT, { binary: "git" });
    return git;
  } catch {
    throw new Error("simple-git not available");
  }
}

async function isGitRepo() {
  try {
    const g = getGit();
    await g.status();
    return true;
  } catch {
    return false;
  }
}

async function init() {
  const g = getGit();
  await g.init();
  return { ok: true };
}

async function getStatus() {
  const g = getGit();
  const status = await g.status();
  const log = await g.log({ maxCount: 20 }).catch(() => ({ all: [] }));
  const remotes = await g.getRemotes(true).catch(() => []);
  const branches = await g.branchLocal().catch(() => ({ current: "main", branches: {} }));

  return {
    branch: status.current || "main",
    tracking: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    staged: status.staged,
    modified: status.modified,
    created: status.created,
    deleted: status.deleted,
    renamed: status.renamed.map(r => ({ from: r.from, to: r.to })),
    untracked: status.not_added,
    conflicted: status.conflicted,
    commits: log.all.map(c => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      author: c.author_name,
      date: c.date,
    })),
    remotes: remotes.map(r => ({ name: r.name, url: r.refs?.fetch || "" })),
    branches: Object.keys(branches.branches),
    currentBranch: branches.current,
  };
}

async function getDiff(filePath) {
  const g = getGit();
  if (filePath) {
    const staged = await g.diff(["--staged", "--", filePath]).catch(() => "");
    const unstaged = await g.diff(["--", filePath]).catch(() => "");
    return { staged, unstaged };
  }
  const staged = await g.diff(["--staged"]).catch(() => "");
  const unstaged = await g.diff([]).catch(() => "");
  return { staged, unstaged };
}

async function stage(files) {
  const g = getGit();
  if (files === "all" || files === ".") {
    await g.add(".");
  } else if (Array.isArray(files)) {
    await g.add(files);
  } else {
    await g.add(files);
  }
  return { ok: true };
}

async function unstage(files) {
  const g = getGit();
  if (Array.isArray(files)) {
    await g.reset(["HEAD", "--", ...files]);
  } else {
    await g.reset(["HEAD", "--", files]);
  }
  return { ok: true };
}

async function commit(message) {
  const g = getGit();
  const result = await g.commit(message);
  return { ok: true, commit: result.commit, summary: result.summary };
}

async function push(remote = "origin", branch = null) {
  const g = getGit();
  const status = await g.status();
  const b = branch || status.current;
  const result = await g.push(remote, b);
  return { ok: true, result };
}

async function pull(remote = "origin", branch = null) {
  const g = getGit();
  const status = await g.status();
  const b = branch || status.current;
  const result = await g.pull(remote, b);
  return { ok: true, result };
}

async function checkout(branch, create = false) {
  const g = getGit();
  if (create) {
    await g.checkoutLocalBranch(branch);
  } else {
    await g.checkout(branch);
  }
  return { ok: true, branch };
}

async function discard(filePath) {
  const g = getGit();
  await g.checkout(["--", filePath]);
  return { ok: true };
}

async function getFileLog(filePath) {
  const g = getGit();
  const log = await g.log({ file: filePath, maxCount: 30 }).catch(() => ({ all: [] }));
  return log.all.map(c => ({
    hash: c.hash.slice(0, 7),
    fullHash: c.hash,
    message: c.message,
    author: c.author_name,
    date: c.date,
  }));
}

async function getFileDiffAtCommit(filePath, hash) {
  const g = getGit();
  const diff = await g.show([`${hash}:${filePath}`]).catch(() => "");
  return diff;
}

async function addRemote(name, url) {
  const g = getGit();
  await g.addRemote(name, url);
  return { ok: true };
}

module.exports = {
  isGitRepo, init, getStatus, getDiff, stage, unstage,
  commit, push, pull, checkout, discard, getFileLog,
  getFileDiffAtCommit, addRemote,
};
