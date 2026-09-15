#!/usr/bin/env python3
"""Fixed, read-only dirfd adapter for the connected repository tools.

The model never supplies a root, command, or environment. Node calls this
module with one bounded JSON request; every descendant is opened relative to
an already-open directory descriptor with O_NOFOLLOW.
"""

import base64
import errno
import hashlib
import json
import os
import stat
import sys

MAX_PATH_CHARS = 1000
MAX_NAME_BYTES = 255
MAX_READ_BYTES = 512 * 1024
MAX_LIST_RESULTS = 200
MAX_DIRECTORY_NAMES = 10_000
MAX_GREP_FILES = 500
MAX_GREP_BYTES = 5 * 1024 * 1024
MAX_GREP_DEPTH = 24
MAX_GREP_ENTRIES = 10_000


class RepoFsError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def fail(code, message):
    raise RepoFsError(code, message)


def check_platform():
    required = ("O_NOFOLLOW", "O_DIRECTORY")
    if os.name != "posix" or any(not hasattr(os, flag) for flag in required) or os.open not in os.supports_dir_fd:
        fail("unsupported_platform", "secure repository reads are unavailable on this host")


def identity(info):
    return str(info.st_dev), str(info.st_ino)


def same_identity(info, device, inode):
    return identity(info) == (str(device), str(inode))


def classify_os_error(error, *, root=False):
    if error.errno == errno.ELOOP:
        return RepoFsError("symlink", "symbolic links are not followed in repository paths")
    if error.errno in (errno.ENOENT, errno.ENOTDIR):
        return RepoFsError("path_unavailable", "repository path is unavailable")
    if error.errno in (errno.EACCES, errno.EPERM):
        return RepoFsError("path_denied", "repository path cannot be read")
    if error.errno == errno.ENAMETOOLONG:
        return RepoFsError("invalid_path", "repository path is too long")
    if root:
        return RepoFsError("root_unavailable", "bound repository root is unavailable")
    return RepoFsError("path_unavailable", "repository path cannot be read")


def open_root(root_path):
    check_platform()
    if not isinstance(root_path, str) or not root_path or len(root_path) > 4000 or "\x00" in root_path or not os.path.isabs(root_path):
        fail("invalid_root", "repository root must be an absolute host path")
    try:
        canonical = os.path.realpath(root_path)
        flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
        fd = os.open(canonical, flags)
        info = os.fstat(fd)
        named = os.stat(canonical, follow_symlinks=False)
        if not stat.S_ISDIR(info.st_mode) or not stat.S_ISDIR(named.st_mode) or identity(info) != identity(named):
            os.close(fd)
            fail("root_changed", "repository root changed while it was being connected")
        return canonical, str(info.st_dev), str(info.st_ino)
    except RepoFsError:
        raise
    except OSError as error:
        raise classify_os_error(error, root=True) from None


def open_bound_root(root_path, device, inode):
    check_platform()
    if not isinstance(root_path, str) or not root_path or len(root_path) > 4000 or not os.path.isabs(root_path) or "\x00" in root_path:
        fail("invalid_root", "bound repository identity is invalid")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
    try:
        fd = os.open(root_path, flags)
        info = os.fstat(fd)
        named = os.stat(root_path, follow_symlinks=False)
        if not stat.S_ISDIR(info.st_mode) or not stat.S_ISDIR(named.st_mode) or not same_identity(info, device, inode) or identity(info) != identity(named):
            os.close(fd)
            fail("root_changed", "bound repository root was replaced; reconnect it")
        return fd
    except RepoFsError:
        raise
    except OSError as error:
        raise classify_os_error(error, root=True) from None


def verify_bound_root(root_path, root_fd, device, inode):
    try:
        opened = os.fstat(root_fd)
        named = os.stat(root_path, follow_symlinks=False)
        if not stat.S_ISDIR(opened.st_mode) or not stat.S_ISDIR(named.st_mode) or not same_identity(opened, device, inode) or identity(opened) != identity(named):
            fail("root_changed", "bound repository root changed during the read")
    except RepoFsError:
        raise
    except OSError as error:
        raise RepoFsError("root_changed", "bound repository root changed during the read") from None


def split_relative_path(value, *, allow_root=False):
    if not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS or "\x00" in value or "\\" in value:
        fail("invalid_path", "repository paths must be bounded relative paths using '/' separators")
    if value == "." and allow_root:
        return []
    if value.startswith("/"):
        fail("invalid_path", "absolute repository paths are not allowed")
    parts = value.split("/")
    if any(part in ("", ".", "..") for part in parts):
        fail("invalid_path", "repository paths cannot contain empty, '.' or '..' segments")
    try:
        if any(len(os.fsencode(part)) > MAX_NAME_BYTES for part in parts):
            fail("invalid_path", "repository path segment is too long")
    except UnicodeEncodeError:
        fail("invalid_path", "repository path segment is invalid")
    if any(part.casefold() == ".git" for part in parts):
        fail("protected_path", "Git control paths cannot be read or searched")
    return parts


def open_directory(root_fd, parts, root_device):
    current = os.dup(root_fd)
    try:
        for part in parts:
            flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
            try:
                child = os.open(part, flags, dir_fd=current)
            except OSError as error:
                raise classify_os_error(error) from None
            info = os.fstat(child)
            if not stat.S_ISDIR(info.st_mode):
                os.close(child)
                fail("not_directory", "repository path component is not a directory")
            if str(info.st_dev) != str(root_device):
                os.close(child)
                fail("nested_filesystem", "repository traversal cannot cross into another mounted filesystem")
            os.close(current)
            current = child
        return current
    except Exception:
        try:
            os.close(current)
        except OSError:
            pass
        raise


def bounded_names(directory_fd, limit=MAX_DIRECTORY_NAMES):
    names = []
    truncated = False
    try:
        with os.scandir(directory_fd) as entries:
            for entry in entries:
                if len(names) >= limit:
                    truncated = True
                    break
                names.append(entry.name)
    except OSError as error:
        raise classify_os_error(error) from None
    names.sort()
    return names, truncated


def list_directory(root_fd, root_device, requested_path):
    parts = split_relative_path(requested_path, allow_root=True)
    directory_fd = open_directory(root_fd, parts, root_device)
    try:
        names, truncated_by_budget = bounded_names(directory_fd)
        names = [name for name in names if name.casefold() != ".git"]
        entries = []
        for name in names[:MAX_LIST_RESULTS]:
            try:
                info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            except FileNotFoundError:
                continue
            if stat.S_ISLNK(info.st_mode):
                entries.append({"name": name, "kind": "symlink", "bytes": None})
            elif stat.S_ISDIR(info.st_mode):
                if str(info.st_dev) != str(root_device):
                    entries.append({"name": name, "kind": "other-filesystem", "bytes": None})
                else:
                    entries.append({"name": name, "kind": "directory", "bytes": None})
            elif stat.S_ISREG(info.st_mode) and str(info.st_dev) == str(root_device):
                entries.append({"name": name, "kind": "file", "bytes": info.st_size})
            else:
                entries.append({"name": name, "kind": "special", "bytes": None})
        return {"path": requested_path, "entries": entries, "truncated": truncated_by_budget or len(names) > MAX_LIST_RESULTS}
    finally:
        os.close(directory_fd)


def read_file_at(parent_fd, name, root_device, maximum=MAX_READ_BYTES):
    flags = os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_CLOEXEC", 0)
    try:
        fd = os.open(name, flags, dir_fd=parent_fd)
    except OSError as error:
        raise classify_os_error(error) from None
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode):
            fail("not_file", "repository path is not a regular file")
        if str(before.st_dev) != str(root_device):
            fail("nested_filesystem", "repository read cannot cross into another mounted filesystem")
        if before.st_size > maximum:
            fail("file_too_large", "repository file exceeds the read limit")
        chunks = []
        total = 0
        while total <= maximum:
            chunk = os.read(fd, min(64 * 1024, maximum + 1 - total))
            if not chunk:
                break
            chunks.append(chunk)
            total += len(chunk)
        if total > maximum:
            fail("file_too_large", "repository file exceeds the read limit")
        after = os.fstat(fd)
        if (identity(before) != identity(after) or before.st_size != after.st_size
                or before.st_mtime_ns != after.st_mtime_ns or before.st_ctime_ns != after.st_ctime_ns):
            fail("source_changed", "repository file changed while it was being read")
        data = b"".join(chunks)
        return data, hashlib.sha256(data).hexdigest()
    finally:
        os.close(fd)


def read_repository_file(root_fd, root_device, requested_path):
    parts = split_relative_path(requested_path)
    parent_fd = open_directory(root_fd, parts[:-1], root_device)
    try:
        data, digest = read_file_at(parent_fd, parts[-1], root_device)
        return {"path": requested_path, "bytes": len(data), "sha256": digest, "dataBase64": base64.b64encode(data).decode("ascii")}
    finally:
        os.close(parent_fd)


def scan_text_files(root_fd, root_device, requested_path):
    parts = split_relative_path(requested_path, allow_root=True)
    start_fd = open_directory(root_fd, parts, root_device)
    files = []
    counters = {"bytes": 0, "entries": 0, "skippedBinary": 0, "skippedLarge": 0, "skippedSymlinks": 0}
    truncated = False

    def visit(directory_fd, prefix, depth):
        nonlocal truncated
        names, names_truncated = bounded_names(directory_fd)
        if names_truncated:
            truncated = True
        for name in names:
            if truncated:
                return
            counters["entries"] += 1
            if counters["entries"] > MAX_GREP_ENTRIES:
                truncated = True
                return
            if name.casefold() == ".git":
                continue
            relative = prefix + "/" + name if prefix else name
            try:
                info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
            except FileNotFoundError:
                truncated = True
                continue
            if stat.S_ISLNK(info.st_mode):
                counters["skippedSymlinks"] += 1
                continue
            if stat.S_ISDIR(info.st_mode):
                if str(info.st_dev) != str(root_device):
                    continue
                if depth >= MAX_GREP_DEPTH:
                    truncated = True
                    continue
                flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
                try:
                    child_fd = os.open(name, flags, dir_fd=directory_fd)
                except OSError:
                    truncated = True
                    continue
                try:
                    if str(os.fstat(child_fd).st_dev) != str(root_device):
                        continue
                    visit(child_fd, relative, depth + 1)
                finally:
                    os.close(child_fd)
                continue
            if not stat.S_ISREG(info.st_mode) or str(info.st_dev) != str(root_device):
                continue
            if info.st_size > MAX_READ_BYTES:
                counters["skippedLarge"] += 1
                continue
            if len(files) >= MAX_GREP_FILES or counters["bytes"] + info.st_size > MAX_GREP_BYTES:
                truncated = True
                return
            try:
                data, digest = read_file_at(directory_fd, name, root_device)
            except RepoFsError as error:
                if error.code in ("file_too_large", "source_changed", "path_unavailable"):
                    truncated = True
                    continue
                raise
            if b"\x00" in data[:8000]:
                counters["skippedBinary"] += 1
                continue
            try:
                data.decode("utf-8", errors="strict")
            except UnicodeDecodeError:
                counters["skippedBinary"] += 1
                continue
            counters["bytes"] += len(data)
            files.append({"path": relative, "bytes": len(data), "sha256": digest, "dataBase64": base64.b64encode(data).decode("ascii")})

    try:
        visit(start_fd, requested_path if requested_path != "." else "", 0)
        files.sort(key=lambda item: item["path"])
        return {
            "path": requested_path, "files": files, "truncated": truncated,
            "scannedBytes": counters["bytes"], "visitedEntries": counters["entries"],
            "skippedBinary": counters["skippedBinary"], "skippedLarge": counters["skippedLarge"],
            "skippedSymlinks": counters["skippedSymlinks"],
        }
    finally:
        os.close(start_fd)


def run_request(request):
    if not isinstance(request, dict):
        fail("invalid_request", "repository request is invalid")
    operation = request.get("operation")
    if operation == "bind":
        if set(request) != {"operation", "rootPath"}:
            fail("invalid_request", "repository bind request fields are invalid")
        root_path, device, inode = open_root(request.get("rootPath"))
        return {"path": root_path, "device": device, "inode": inode}
    if operation == "verify":
        if set(request) != {"operation", "rootPath", "device", "inode"}:
            fail("invalid_request", "repository verification request fields are invalid")
        device = request.get("device")
        inode = request.get("inode")
        if not isinstance(device, str) or not device.isdecimal() or not isinstance(inode, str) or not inode.isdecimal():
            fail("invalid_root", "bound repository identity is invalid")
        root_path = request.get("rootPath")
        root_fd = open_bound_root(root_path, device, inode)
        try:
            verify_bound_root(root_path, root_fd, device, inode)
            return {"verified": True}
        finally:
            os.close(root_fd)
    if operation not in ("list", "read", "grep"):
        fail("invalid_request", "repository operation is invalid")
    if not {"operation", "rootPath", "device", "inode"}.issubset(request) or not set(request).issubset({"operation", "rootPath", "device", "inode", "path"}):
        fail("invalid_request", "repository read request fields are invalid")
    if operation == "read" and not isinstance(request.get("path"), str):
        fail("invalid_request", "repository file path is required")
    root_path = request.get("rootPath")
    device = request.get("device")
    inode = request.get("inode")
    if not isinstance(device, str) or not device.isdecimal() or not isinstance(inode, str) or not inode.isdecimal():
        fail("invalid_root", "bound repository identity is invalid")
    root_fd = open_bound_root(root_path, device, inode)
    try:
        requested_path = request.get("path", ".")
        if operation == "list":
            result = list_directory(root_fd, device, requested_path)
        elif operation == "read":
            result = read_repository_file(root_fd, device, requested_path)
        else:
            result = scan_text_files(root_fd, device, requested_path)
        verify_bound_root(root_path, root_fd, device, inode)
        return result
    finally:
        os.close(root_fd)


def main():
    try:
        line = sys.stdin.buffer.readline(64 * 1024 + 1)
        if len(line) > 64 * 1024 or not line.endswith(b"\n"):
            fail("invalid_request", "repository request exceeded the input limit")
        request = json.loads(line.decode("utf-8", errors="strict"))
        result = run_request(request)
        sys.stdout.write(json.dumps({"ok": True, "result": result}, ensure_ascii=True, separators=(",", ":")) + "\n")
    except RepoFsError as error:
        sys.stdout.write(json.dumps({"ok": False, "error": {"code": error.code, "message": str(error)}}, ensure_ascii=True, separators=(",", ":")) + "\n")
        return 2
    except Exception:
        sys.stdout.write(json.dumps({"ok": False, "error": {"code": "repository_unavailable", "message": "repository operation failed"}}, separators=(",", ":")) + "\n")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
