#!/usr/bin/env python3
"""Fixed dirfd adapter for the connected repository tools and the session
workspace tools.

Repository operations are read-only. Workspace operations read, list and
search, and write one file: a new file staged in the target's parent directory
and renamed over the target only on the Host's separate commit request.

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
MAX_REQUEST_BYTES = 8 * 1024 * 1024
DIRECTORY_FLAGS = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0)
FILE_FLAGS = os.O_RDONLY | os.O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0) | getattr(os, "O_CLOEXEC", 0)


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
        return fd, canonical, str(info.st_dev), str(info.st_ino)
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


def scan_text_files(root_fd, root_device, requested_path, exclude_generated=False):
    parts = split_relative_path(requested_path, allow_root=True)
    start_fd = open_directory(root_fd, parts, root_device)
    files = []
    counters = {"bytes": 0, "entries": 0, "skippedBinary": 0, "skippedLarge": 0, "skippedSymlinks": 0, "skippedGeneratedDirectories": 0}
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
                if exclude_generated and name.casefold() == "node_modules":
                    counters["skippedGeneratedDirectories"] += 1
                    continue
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
        if exclude_generated and any(part.casefold() == "node_modules" for part in parts):
            counters["skippedGeneratedDirectories"] = 1
        else:
            visit(start_fd, requested_path if requested_path != "." else "", 0)
        files.sort(key=lambda item: item["path"])
        return {
            "path": requested_path, "files": files, "truncated": truncated,
            "scannedBytes": counters["bytes"], "visitedEntries": counters["entries"],
            "skippedBinary": counters["skippedBinary"], "skippedLarge": counters["skippedLarge"],
            "skippedSymlinks": counters["skippedSymlinks"],
            **({"skippedGeneratedDirectories": counters["skippedGeneratedDirectories"]} if exclude_generated else {}),
        }
    finally:
        os.close(start_fd)


# Session workspace search and listing. The identity of every reported file is
# established by walking from one root descriptor: each component is opened
# relative to its parent's descriptor with O_NOFOLLOW, and nothing is resolved
# again by name from the root. ws_scan names files without opening them;
# ws_read opens only the files the Host admitted, walking descriptor-relative
# again and reading a file only when its device and inode are the ones ws_scan
# reported.

def workspace_parts(value):
    if not isinstance(value, list) or len(value) > MAX_PATH_CHARS:
        fail("invalid_path", "workspace path is invalid")
    for part in value:
        if not isinstance(part, str) or part in ("", ".", "..") or "/" in part or "\x00" in part:
            fail("invalid_path", "workspace path is invalid")
        try:
            if len(os.fsencode(part)) > MAX_NAME_BYTES:
                fail("invalid_path", "workspace path segment is too long")
        except UnicodeEncodeError:
            fail("invalid_path", "workspace path segment is invalid")
    return value


def workspace_open_error(error, parent_fd, name, last):
    try:
        if stat.S_ISLNK(os.stat(name, dir_fd=parent_fd, follow_symlinks=False).st_mode):
            return RepoFsError("symlink", "symbolic links are not followed in workspace paths")
    except OSError:
        pass
    if error.errno in (errno.ENOENT, errno.ENOTDIR) and not last:
        return RepoFsError("parent_unavailable", "parent directory does not exist")
    return classify_os_error(error)


def on_disk_name(parent_fd, requested, opened):
    """The parent directory's own spelling of the entry that was opened, which
    differs from the requested spelling on a volume that aliases names."""
    try:
        with os.scandir(parent_fd) as entries:
            candidates = [entry.name for entry in entries if entry.name == requested or entry.inode() == opened.st_ino]
    except OSError as error:
        raise classify_os_error(error) from None
    candidates.sort(key=lambda name: name != requested)
    for name in candidates:
        try:
            if identity(os.stat(name, dir_fd=parent_fd, follow_symlinks=False)) == identity(opened):
                return name
        except OSError:
            continue
    fail("path_changed", "workspace path changed while it was being opened")


def open_workspace_scope(root_fd, parts, *, parents_only=False):
    """Opens each component relative to its parent's descriptor. With
    parents_only every component must be a directory and a missing one is a
    missing parent; otherwise the last component may be any entry."""
    current = os.dup(root_fd)
    try:
        info = os.fstat(current)
        spelled = []
        for index, part in enumerate(parts):
            last = index == len(parts) - 1 and not parents_only
            try:
                child = os.open(part, FILE_FLAGS if last else DIRECTORY_FLAGS, dir_fd=current)
            except OSError as error:
                raise workspace_open_error(error, current, part, last) from None
            try:
                info = os.fstat(child)
                spelled.append(on_disk_name(current, part, info))
            except BaseException:
                os.close(child)
                raise
            os.close(current)
            current = child
        return current, spelled, info
    except BaseException:
        os.close(current)
        raise


def workspace_file(relative, info):
    return {"path": relative, "bytes": info.st_size, "mtimeNs": str(info.st_mtime_ns), "device": str(info.st_dev), "inode": str(info.st_ino)}


def walk_workspace(directory_fd, prefix, files):
    try:
        with os.scandir(directory_fd) as entries:
            names = [entry.name for entry in entries]
    except OSError as error:
        raise classify_os_error(error) from None
    for name in names:
        relative = prefix + "/" + name if prefix else name
        try:
            info = os.stat(name, dir_fd=directory_fd, follow_symlinks=False)
        except FileNotFoundError:
            continue
        if stat.S_ISDIR(info.st_mode):
            try:
                child = os.open(name, DIRECTORY_FLAGS, dir_fd=directory_fd)
            except OSError as error:
                # Replaced by a symlink or removed since it was named: skip it.
                if error.errno in (errno.ELOOP, errno.ENOENT, errno.ENOTDIR):
                    continue
                raise classify_os_error(error) from None
            try:
                walk_workspace(child, relative, files)
            finally:
                os.close(child)
        elif stat.S_ISREG(info.st_mode):
            files.append(workspace_file(relative, info))


def scan_workspace(root_fd, parts):
    scope_fd, spelled, info = open_workspace_scope(root_fd, parts)
    try:
        prefix = "/".join(spelled)
        files = []
        if stat.S_ISDIR(info.st_mode):
            walk_workspace(scope_fd, prefix, files)
        elif stat.S_ISREG(info.st_mode):
            files.append(workspace_file(prefix, info))
        return {"path": prefix or ".", "files": files}
    finally:
        os.close(scope_fd)


def open_workspace_directory(root_fd, parts):
    current = os.dup(root_fd)
    try:
        for part in parts:
            child = os.open(part, DIRECTORY_FLAGS, dir_fd=current)
            os.close(current)
            current = child
        return current
    except BaseException:
        os.close(current)
        raise


def read_workspace_files(root_fd, files, mode, max_file_bytes, max_batch_bytes):
    """Read, in order, the admitted files named by an earlier ws_scan. A file
    that is no longer reachable descriptor-relative under its name, or whose
    identity differs, yields null. Text mode stops before the file that would
    take the batch over max_batch_bytes; `consumed` says how far it got."""
    results = []
    total = 0
    cached_parts, cached_fd = None, None
    try:
        for item in files:
            path, device, inode = item.get("path"), item.get("device"), item.get("inode")
            if not isinstance(path, str) or not isinstance(device, str) or not isinstance(inode, str):
                fail("invalid_request", "workspace read request fields are invalid")
            parts = workspace_parts(path.split("/"))
            if parts[:-1] != cached_parts:
                if cached_fd is not None:
                    os.close(cached_fd)
                cached_parts, cached_fd = parts[:-1], None
                try:
                    cached_fd = open_workspace_directory(root_fd, parts[:-1])
                except OSError:
                    pass
            if cached_fd is None:
                results.append(None)
                continue
            try:
                fd = os.open(parts[-1], FILE_FLAGS, dir_fd=cached_fd)
            except OSError:
                results.append(None)
                continue
            try:
                info = os.fstat(fd)
                if not stat.S_ISREG(info.st_mode) or identity(info) != (device, inode):
                    results.append(None)
                    continue
                if mode == "hash":
                    digest = hashlib.sha256()
                    size = 0
                    while True:
                        chunk = os.read(fd, 1024 * 1024)
                        if not chunk:
                            break
                        digest.update(chunk)
                        size += len(chunk)
                    results.append({"bytes": size, "sha256": digest.hexdigest(), "mtimeNs": str(os.fstat(fd).st_mtime_ns)})
                    continue
                if results and total + info.st_size > max_batch_bytes:
                    break
                chunks = []
                size = 0
                while size <= max_file_bytes:
                    chunk = os.read(fd, min(1024 * 1024, max_file_bytes + 1 - size))
                    if not chunk:
                        break
                    chunks.append(chunk)
                    size += len(chunk)
                data = b"".join(chunks)
                total += len(data)
                if len(data) > max_file_bytes or b"\x00" in data[:8000]:
                    results.append(None)
                    continue
                results.append({"dataBase64": base64.b64encode(data).decode("ascii")})
            finally:
                os.close(fd)
    finally:
        if cached_fd is not None:
            os.close(cached_fd)
    return {"files": results, "consumed": len(results)}


# Single-file workspace access: path admission, ws_read and ws_write. The
# parent directories are opened descriptor-relative from the root and the last
# component is never followed. A write is staged as a new file in the parent
# directory and published by renameat within that same directory descriptor
# after the Host has saved history; a symlink, directory or other non-regular
# target is never replaced.

def workspace_target(root_fd, parts):
    """Returns (parent_fd, on-disk parent parts, target name, lstat or None).
    The name is the directory entry's own spelling when the target exists and
    the requested spelling when it does not."""
    parent_fd, spelled, _ = open_workspace_scope(root_fd, parts[:-1], parents_only=True)
    try:
        name = parts[-1]
        try:
            info = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        except FileNotFoundError:
            return parent_fd, spelled, name, None
        except OSError as error:
            raise classify_os_error(error) from None
        if stat.S_ISLNK(info.st_mode):
            fail("symlink", "symbolic links are not followed in workspace paths")
        return parent_fd, spelled, on_disk_name(parent_fd, name, info), info
    except BaseException:
        os.close(parent_fd)
        raise


def resolve_workspace_path(root_fd, parts):
    if not parts:
        return {"path": "."}
    parent_fd, spelled, name, _ = workspace_target(root_fd, parts)
    os.close(parent_fd)
    return {"path": "/".join(spelled + [name])}


def read_workspace_file(root_fd, parts, max_bytes):
    fd, spelled, info = open_workspace_scope(root_fd, parts)
    try:
        if not stat.S_ISREG(info.st_mode):
            fail("not_file", "workspace path is not a regular file")
        if info.st_size > max_bytes:
            fail("file_too_large", "workspace file exceeds the read limit")
        chunks = []
        size = 0
        while size <= max_bytes:
            chunk = os.read(fd, min(1024 * 1024, max_bytes + 1 - size))
            if not chunk:
                break
            chunks.append(chunk)
            size += len(chunk)
        if size > max_bytes:
            fail("file_too_large", "workspace file exceeds the read limit")
        data = b"".join(chunks)
        return {"path": "/".join(spelled) or ".", "bytes": info.st_size, "dataBase64": base64.b64encode(data).decode("ascii")}
    finally:
        os.close(fd)


def write_content(request):
    data64, digest, maximum = request.get("dataBase64"), request.get("contentSha256"), request.get("maxFileBytes")
    if not isinstance(maximum, int) or isinstance(maximum, bool) or maximum < 1 or not isinstance(data64, str) or len(data64) > ((maximum + 2) // 3) * 4:
        fail("write_too_large", "workspace write exceeds the size limit")
    try:
        content = base64.b64decode(data64, validate=True)
    except ValueError:
        fail("invalid_content", "workspace write content is invalid")
    if len(content) > maximum or not isinstance(digest, str) or hashlib.sha256(content).hexdigest() != digest:
        fail("invalid_content", "workspace write content does not match its hash")
    return content


def stage_workspace_write(root_fd, parts, temp_name, content):
    workspace_parts([temp_name])
    parent_fd, spelled, name, info = workspace_target(root_fd, parts)
    try:
        if info is not None and not stat.S_ISREG(info.st_mode):
            fail("not_file", "workspace target is not a regular file")
        try:
            fd = os.open(temp_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | getattr(os, "O_CLOEXEC", 0), 0o666, dir_fd=parent_fd)
        except OSError as error:
            raise classify_os_error(error) from None
        try:
            view = memoryview(content)
            written = 0
            while written < len(view):
                written += os.write(fd, view[written:])
            staged = os.fstat(fd)
        except BaseException:
            os.close(fd)
            try:
                os.unlink(temp_name, dir_fd=parent_fd)
            except OSError:
                pass
            raise
        os.close(fd)
        parent = os.fstat(parent_fd)
        return {"parts": spelled + [name], "path": "/".join(spelled + [name]),
                "tempDevice": str(staged.st_dev), "tempInode": str(staged.st_ino),
                "parentDevice": str(parent.st_dev), "parentInode": str(parent.st_ino)}
    finally:
        os.close(parent_fd)


def commit_workspace_write(root_fd, request):
    parts = workspace_parts(request.get("parts"))
    temp_name = request.get("tempName")
    workspace_parts([temp_name])
    if not parts:
        fail("invalid_path", "workspace path is invalid")
    parent_fd, _, name, info = workspace_target(root_fd, parts)
    try:
        if identity(os.fstat(parent_fd)) != (request.get("parentDevice"), request.get("parentInode")):
            fail("workspace_changed", "workspace directory changed during the write")
        try:
            staged = os.stat(temp_name, dir_fd=parent_fd, follow_symlinks=False)
        except OSError:
            fail("workspace_changed", "staged workspace write is missing")
        if not stat.S_ISREG(staged.st_mode) or identity(staged) != (request.get("tempDevice"), request.get("tempInode")):
            fail("workspace_changed", "staged workspace write was replaced")
        if info is not None and not stat.S_ISREG(info.st_mode):
            fail("not_file", "workspace target is not a regular file")
        try:
            os.rename(temp_name, name, src_dir_fd=parent_fd, dst_dir_fd=parent_fd)
        except OSError as error:
            if error.errno in (errno.EISDIR, errno.ENOTEMPTY, errno.EEXIST):
                fail("not_file", "workspace target is not a regular file")
            raise classify_os_error(error) from None
        return {"committed": True}
    finally:
        os.close(parent_fd)


def discard_workspace_write(root_fd, parts, temp_name):
    workspace_parts([temp_name])
    try:
        parent_fd, _, _ = open_workspace_scope(root_fd, parts[:-1], parents_only=True)
    except RepoFsError:
        return {"discarded": False}
    try:
        if stat.S_ISREG(os.stat(temp_name, dir_fd=parent_fd, follow_symlinks=False).st_mode):
            os.unlink(temp_name, dir_fd=parent_fd)
            return {"discarded": True}
    except OSError:
        pass
    finally:
        os.close(parent_fd)
    return {"discarded": False}


WORKSPACE_FILE_OPERATIONS = {
    "ws_resolve": {"operation", "rootPath", "parts"},
    "ws_read_file": {"operation", "rootPath", "parts", "maxFileBytes"},
    "ws_write_stage": {"operation", "rootPath", "parts", "tempName", "dataBase64", "contentSha256", "maxFileBytes"},
    "ws_write_commit": {"operation", "rootPath", "device", "inode", "parts", "tempName", "tempDevice", "tempInode", "parentDevice", "parentInode"},
    "ws_write_discard": {"operation", "rootPath", "parts", "tempName"},
}


def run_workspace_file_operation(request):
    operation = request["operation"]
    if set(request) != WORKSPACE_FILE_OPERATIONS[operation]:
        fail("invalid_request", "workspace request fields are invalid")
    if operation == "ws_write_commit":
        device, inode = request.get("device"), request.get("inode")
        if not isinstance(device, str) or not device.isdecimal() or not isinstance(inode, str) or not inode.isdecimal():
            fail("invalid_root", "bound workspace identity is invalid")
        root_path = request.get("rootPath")
        root_fd = open_bound_root(root_path, device, inode)
        try:
            return commit_workspace_write(root_fd, request)
        finally:
            os.close(root_fd)
    parts = workspace_parts(request.get("parts"))
    if operation == "ws_read_file":
        maximum = request.get("maxFileBytes")
        if not isinstance(maximum, int) or isinstance(maximum, bool) or maximum < 1:
            fail("invalid_request", "workspace read limit is invalid")
    content = write_content(request) if operation == "ws_write_stage" else None
    if operation in ("ws_write_stage", "ws_write_discard") and not parts:
        fail("not_file", "workspace path is not a regular file")
    root_fd, root_path, device, inode = open_root(request.get("rootPath"))
    try:
        if operation == "ws_resolve":
            result = resolve_workspace_path(root_fd, parts)
        elif operation == "ws_read_file":
            result = read_workspace_file(root_fd, parts, request["maxFileBytes"])
        elif operation == "ws_write_stage":
            result = {"rootPath": root_path, "device": device, "inode": inode,
                      **stage_workspace_write(root_fd, parts, request.get("tempName"), content)}
        else:
            result = discard_workspace_write(root_fd, parts, request.get("tempName"))
        verify_bound_root(root_path, root_fd, device, inode)
        return result
    finally:
        os.close(root_fd)


def run_request(request):
    if not isinstance(request, dict):
        fail("invalid_request", "repository request is invalid")
    operation = request.get("operation")
    if operation == "bind":
        if set(request) != {"operation", "rootPath"}:
            fail("invalid_request", "repository bind request fields are invalid")
        root_fd, root_path, device, inode = open_root(request.get("rootPath"))
        os.close(root_fd)
        return {"path": root_path, "device": device, "inode": inode}
    if operation in WORKSPACE_FILE_OPERATIONS:
        return run_workspace_file_operation(request)
    if operation == "ws_scan":
        if set(request) != {"operation", "rootPath", "parts"}:
            fail("invalid_request", "workspace scan request fields are invalid")
        parts = workspace_parts(request.get("parts"))
        root_fd, root_path, device, inode = open_root(request.get("rootPath"))
        try:
            result = scan_workspace(root_fd, parts)
            verify_bound_root(root_path, root_fd, device, inode)
            return {"rootPath": root_path, "device": device, "inode": inode, **result}
        finally:
            os.close(root_fd)
    if operation == "ws_read":
        if set(request) != {"operation", "rootPath", "device", "inode", "mode", "files", "maxFileBytes", "maxBatchBytes"}:
            fail("invalid_request", "workspace read request fields are invalid")
        mode, files = request.get("mode"), request.get("files")
        max_file_bytes, max_batch_bytes = request.get("maxFileBytes"), request.get("maxBatchBytes")
        if mode not in ("text", "hash") or not isinstance(files, list) or any(not isinstance(item, dict) for item in files):
            fail("invalid_request", "workspace read request fields are invalid")
        if any(not isinstance(value, int) or isinstance(value, bool) or value < 1 for value in (max_file_bytes, max_batch_bytes)):
            fail("invalid_request", "workspace read limits are invalid")
        device, inode = request.get("device"), request.get("inode")
        if not isinstance(device, str) or not device.isdecimal() or not isinstance(inode, str) or not inode.isdecimal():
            fail("invalid_root", "bound workspace identity is invalid")
        root_path = request.get("rootPath")
        root_fd = open_bound_root(root_path, device, inode)
        try:
            result = read_workspace_files(root_fd, files, mode, max_file_bytes, max_batch_bytes)
            verify_bound_root(root_path, root_fd, device, inode)
            return result
        finally:
            os.close(root_fd)
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
    allowed_fields = {"operation", "rootPath", "device", "inode", "path"}
    if operation == "grep":
        allowed_fields.add("excludeGenerated")
    if "excludeGenerated" in request and not isinstance(request["excludeGenerated"], bool):
        fail("invalid_request", "repository generated-directory option is invalid")
    if not {"operation", "rootPath", "device", "inode"}.issubset(request) or not set(request).issubset(allowed_fields):
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
            result = scan_text_files(root_fd, device, requested_path, request.get("excludeGenerated", False))
        verify_bound_root(root_path, root_fd, device, inode)
        return result
    finally:
        os.close(root_fd)


def main():
    try:
        line = sys.stdin.buffer.readline(MAX_REQUEST_BYTES + 1)
        if len(line) > MAX_REQUEST_BYTES or not line.endswith(b"\n"):
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
