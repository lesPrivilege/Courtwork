#!/usr/bin/env python3
"""Fixed dirfd adapter for Host-owned repository candidate reads and writes.

The model supplies neither a root nor a command. Node passes a Host-resolved
candidate/container identity and one bounded relative path. File operations
walk from open directory descriptors without following symbolic links.
"""

import base64
import ctypes
import errno
import hashlib
import json
import os
import stat
import sys
import uuid

MAX_PATH_CHARS = 1000
MAX_NAME_BYTES = 255
MAX_WRITE_BYTES = 4 * 1024 * 1024
HEX_SHA256 = set("0123456789abcdef")
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)


class CandidateFsError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def fail(code, message):
    raise CandidateFsError(code, message)


def check_platform():
    if (sys.platform != "darwin" and not sys.platform.startswith("linux")):
        fail("unsupported_platform", "repository candidate writes are unavailable on this host")
    if (os.name != "posix" or not O_NOFOLLOW or not O_DIRECTORY
            or os.open not in os.supports_dir_fd or os.rename not in os.supports_dir_fd
            or os.link not in os.supports_dir_fd):
        fail("unsupported_platform", "repository candidate writes lack required file-descriptor operations")


def identity(info):
    return str(info.st_dev), str(info.st_ino)


def same_identity(info, device, inode):
    return identity(info) == (str(device), str(inode))


def classify_os_error(error, *, root=False):
    if error.errno == errno.ELOOP:
        return CandidateFsError("symlink", "symbolic links are not followed in candidate paths")
    if error.errno == errno.EXDEV:
        return CandidateFsError("nested_filesystem", "candidate operation cannot cross a mounted filesystem")
    if error.errno in (errno.ENOENT, errno.ENOTDIR):
        return CandidateFsError("path_unavailable", "candidate path is unavailable")
    if error.errno in (errno.EACCES, errno.EPERM):
        return CandidateFsError("path_denied", "candidate path cannot be changed")
    if error.errno == errno.ENAMETOOLONG:
        return CandidateFsError("invalid_path", "candidate path is too long")
    if root:
        return CandidateFsError("candidate_root_changed", "private candidate root is unavailable or changed")
    return CandidateFsError("candidate_write_failed", "candidate operation failed")


def _linux_mount_id(fd):
    path = f"/proc/self/fdinfo/{fd}"
    try:
        with open(path, "r", encoding="ascii") as stream:
            for line in stream:
                if line.startswith("mnt_id:"):
                    value = line.split(":", 1)[1].strip()
                    if value.isdecimal():
                        return value
    except OSError:
        pass
    fail("mount_scope_unavailable", "Host cannot verify candidate mount boundaries")


class _DarwinFsid(ctypes.Structure):
    _fields_ = [("val", ctypes.c_int32 * 2)]


class _DarwinStatfs(ctypes.Structure):
    # Current Darwin struct statfs layout, matching sys/mount.h's
    # __DARWIN_STRUCT_STATFS64 definition on 64-bit-inode targets.
    _fields_ = [
        ("f_bsize", ctypes.c_uint32), ("f_iosize", ctypes.c_int32),
        ("f_blocks", ctypes.c_uint64), ("f_bfree", ctypes.c_uint64),
        ("f_bavail", ctypes.c_uint64), ("f_files", ctypes.c_uint64),
        ("f_ffree", ctypes.c_uint64), ("f_fsid", _DarwinFsid),
        ("f_owner", ctypes.c_uint32), ("f_type", ctypes.c_uint32),
        ("f_flags", ctypes.c_uint32), ("f_fssubtype", ctypes.c_uint32),
        ("f_fstypename", ctypes.c_char * 16), ("f_mntonname", ctypes.c_char * 1024),
        ("f_mntfromname", ctypes.c_char * 1024), ("f_flags_ext", ctypes.c_uint32),
        ("f_reserved", ctypes.c_uint32 * 7),
    ]


def _darwin_mount_points():
    try:
        libc = ctypes.CDLL(None, use_errno=True)
        getfsstat = libc.getfsstat
        getfsstat.argtypes = [ctypes.POINTER(_DarwinStatfs), ctypes.c_int, ctypes.c_int]
        getfsstat.restype = ctypes.c_int
        required = getfsstat(None, 0, 2)  # MNT_NOWAIT avoids waiting on unrelated volumes.
        if required < 0:
            fail("mount_scope_unavailable", "Host cannot enumerate mounted filesystems")
        capacity = max(required + 8, 16)
        for _ in range(5):
            entries = (_DarwinStatfs * capacity)()
            count = getfsstat(entries, ctypes.sizeof(entries), 2)
            if count < 0:
                fail("mount_scope_unavailable", "Host cannot enumerate mounted filesystems")
            if count < capacity:
                mounts = set()
                for entry in entries[:count]:
                    raw = bytes(entry.f_mntonname).split(b"\0", 1)[0]
                    if raw:
                        try:
                            mounts.add(os.path.normpath(os.fsdecode(raw)))
                        except (OSError, UnicodeError):
                            fail("mount_scope_unavailable", "Host returned an invalid mounted filesystem path")
                return mounts
            capacity *= 2
        fail("mount_scope_unavailable", "mounted filesystem list changed while being read")
    except CandidateFsError:
        raise
    except Exception:
        fail("mount_scope_unavailable", "Host cannot enumerate mounted filesystems")


def path_is_within(parent, child):
    try:
        return os.path.commonpath((parent, child)) == parent
    except (OSError, ValueError):
        return False


def parse_linux_mountinfo(data):
    if not isinstance(data, bytes) or not data or len(data) > 16 * 1024 * 1024:
        fail("mount_scope_unavailable", "Host returned an invalid mounted filesystem table")
    lines = data.split(b"\n")
    if lines and lines[-1] == b"":
        lines.pop()
    if not lines:
        fail("mount_scope_unavailable", "Host returned an empty mounted filesystem table")

    escapes = {b"040": b" ", b"011": b"\t", b"012": b"\n", b"134": b"\\"}
    mounts = set()
    for line in lines:
        if not line:
            fail("mount_scope_unavailable", "Host returned a malformed mounted filesystem table")
        before, separator, after = line.partition(b" - ")
        fields = before.split()
        post_fields = after.split()
        if (not separator or len(fields) < 6 or len(post_fields) < 3
                or not fields[0].isdigit() or not fields[1].isdigit()):
            fail("mount_scope_unavailable", "Host returned a malformed mounted filesystem table")
        device = fields[2].split(b":")
        if len(device) != 2 or not all(part.isdigit() for part in device):
            fail("mount_scope_unavailable", "Host returned a malformed mounted filesystem table")

        encoded_path = fields[4]
        decoded_path = bytearray()
        index = 0
        while index < len(encoded_path):
            if encoded_path[index] != ord("\\"):
                decoded_path.append(encoded_path[index])
                index += 1
                continue
            code = encoded_path[index + 1:index + 4]
            replacement = escapes.get(code)
            if replacement is None:
                fail("mount_scope_unavailable", "Host returned an invalid mounted filesystem path")
            decoded_path.extend(replacement)
            index += 4
        path_value = os.fsdecode(bytes(decoded_path))
        if not path_value.startswith("/"):
            fail("mount_scope_unavailable", "Host returned an invalid mounted filesystem path")
        mounts.add(os.path.normpath(path_value))
    return mounts


def linux_mount_points(mountinfo_path="/proc/self/mountinfo"):
    try:
        with open(mountinfo_path, "rb") as stream:
            data = stream.read(16 * 1024 * 1024 + 1)
    except OSError:
        fail("mount_scope_unavailable", "Host cannot enumerate mounted filesystems")
    return parse_linux_mountinfo(data)


def candidate_mount_descendants(container_path, mount_points):
    container = os.path.normpath(os.path.abspath(container_path))
    return sorted(mount for mount in mount_points if path_is_within(container, mount))


def verify_no_candidate_mount_descendants(container_path):
    if sys.platform.startswith("linux"):
        mounts = linux_mount_points()
    else:
        mounts = _darwin_mount_points()
    if candidate_mount_descendants(container_path, mounts):
        fail("nested_filesystem", "candidate tree contains a mounted filesystem")


def mount_identity(fd):
    if sys.platform.startswith("linux"):
        return _linux_mount_id(fd)
    if sys.platform == "darwin":
        try:
            return os.fstatvfs(fd).f_fsid
        except (AttributeError, OSError):
            fail("mount_scope_unavailable", "Host cannot verify candidate filesystem identity")
    fail("unsupported_platform", "repository candidate writes are unavailable on this host")


def open_bound_directory(root_path, device, inode, code):
    if (not isinstance(root_path, str) or not root_path or len(root_path) > 4000
            or "\x00" in root_path or not os.path.isabs(root_path)):
        fail("invalid_candidate", "candidate identity is invalid")
    if not isinstance(device, str) or not device.isdecimal() or not isinstance(inode, str) or not inode.isdecimal():
        fail("invalid_candidate", "candidate identity is invalid")
    try:
        if os.path.realpath(root_path) != root_path:
            fail("candidate_root_changed", "private candidate path is no longer canonical")
        fd = os.open(root_path, os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC)
        info = os.fstat(fd)
        named = os.stat(root_path, follow_symlinks=False)
        if (not stat.S_ISDIR(info.st_mode) or not stat.S_ISDIR(named.st_mode)
                or not same_identity(info, device, inode) or identity(info) != identity(named)):
            os.close(fd)
            fail(code, "private candidate directory was replaced")
        return fd
    except CandidateFsError:
        raise
    except OSError as error:
        raise classify_os_error(error, root=True) from None


def verify_candidate_container(request):
    container_path = request["candidateDirectory"]
    container_fd = open_bound_directory(
        container_path, request["containerDevice"], request["containerInode"], "candidate_container_changed",
    )
    try:
        verify_no_candidate_mount_descendants(container_path)
        return {"verified": True}
    finally:
        os.close(container_fd)


def open_candidate(request):
    container_path = request.get("candidateDirectory")
    candidate_path = request.get("candidatePath")
    container_fd = open_bound_directory(
        container_path, request.get("containerDevice"), request.get("containerInode"), "candidate_container_changed",
    )
    root_fd = None
    staging_fd = None
    try:
        root_fd = open_bound_directory(
            candidate_path, request.get("device"), request.get("inode"), "candidate_root_changed",
        )
        staging_flags = os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC
        staging_fd = os.open("staging", staging_flags, dir_fd=container_fd)
        staging_info = os.fstat(staging_fd)
        if (not stat.S_ISDIR(staging_info.st_mode)
                or not same_identity(staging_info, request.get("stagingDevice"), request.get("stagingInode"))):
            fail("candidate_container_changed", "private candidate staging directory was replaced")
        root_info = os.fstat(root_fd)
        container_info = os.fstat(container_fd)
        if (str(root_info.st_dev) != str(staging_info.st_dev)
                or str(container_info.st_dev) != str(staging_info.st_dev)):
            fail("nested_filesystem", "candidate staging and worktree must share one filesystem")
        root_mount = mount_identity(root_fd)
        container_mount = mount_identity(container_fd)
        staging_mount = mount_identity(staging_fd)
        if root_mount != container_mount or root_mount != staging_mount:
            fail("nested_filesystem", "candidate staging and worktree must share one mount")
        verify_no_candidate_mount_descendants(container_path)
        return container_fd, root_fd, staging_fd, root_mount
    except Exception:
        if staging_fd is not None:
            os.close(staging_fd)
        if root_fd is not None:
            os.close(root_fd)
        os.close(container_fd)
        raise


def verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount):
    for path, fd, device, inode, code in (
        (request["candidateDirectory"], container_fd, request["containerDevice"], request["containerInode"], "candidate_container_changed"),
        (request["candidatePath"], root_fd, request["device"], request["inode"], "candidate_root_changed"),
    ):
        try:
            if os.path.realpath(path) != path:
                fail(code, "private candidate path is no longer canonical")
            opened = os.fstat(fd)
            named = os.stat(path, follow_symlinks=False)
        except OSError:
            fail(code, "private candidate directory changed during the write")
        if (not stat.S_ISDIR(opened.st_mode) or not stat.S_ISDIR(named.st_mode)
                or not same_identity(opened, device, inode) or identity(opened) != identity(named)):
            fail(code, "private candidate directory changed during the write")
    try:
        staging_named = os.stat("staging", dir_fd=container_fd, follow_symlinks=False)
    except OSError:
        fail("candidate_container_changed", "private candidate staging directory changed during the write")
    if (not stat.S_ISDIR(staging_named.st_mode)
            or not same_identity(staging_named, request["stagingDevice"], request["stagingInode"])
            or identity(staging_named) != identity(os.fstat(staging_fd))):
        fail("candidate_container_changed", "private candidate staging directory changed during the write")
    if mount_identity(root_fd) != root_mount or mount_identity(staging_fd) != root_mount:
        fail("candidate_root_changed", "candidate mount identity changed during the write")
    verify_no_candidate_mount_descendants(request["candidateDirectory"])


def split_relative_path(value):
    if (not isinstance(value, str) or not value or len(value) > MAX_PATH_CHARS
            or "\x00" in value or "\\" in value or value.startswith("/")):
        fail("invalid_path", "candidate paths must be bounded relative paths using '/' separators")
    parts = value.split("/")
    if any(part in ("", ".", "..") for part in parts):
        fail("invalid_path", "candidate paths cannot contain empty, '.', or '..' segments")
    try:
        if any(len(os.fsencode(part)) > MAX_NAME_BYTES for part in parts):
            fail("invalid_path", "candidate path segment is too long")
    except UnicodeEncodeError:
        fail("invalid_path", "candidate path segment is invalid")
    if any(part.casefold() == ".git" for part in parts):
        fail("protected_path", "candidate Git control paths cannot be read or written")
    return parts


def open_directory(root_fd, parts, root_device, root_mount):
    current = os.dup(root_fd)
    try:
        for part in parts:
            try:
                child = os.open(part, os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC, dir_fd=current)
            except OSError as error:
                raise classify_os_error(error) from None
            info = os.fstat(child)
            if not stat.S_ISDIR(info.st_mode):
                os.close(child)
                fail("not_directory", "candidate path component is not a directory")
            if str(info.st_dev) != str(root_device) or mount_identity(child) != root_mount:
                os.close(child)
                fail("nested_filesystem", "candidate traversal cannot cross into another mounted filesystem")
            os.close(current)
            current = child
        return current
    except Exception:
        try:
            os.close(current)
        except OSError:
            pass
        raise


def target_state(parent_fd, name, root_device, root_mount):
    try:
        fd = os.open(name, os.O_RDONLY | O_NOFOLLOW | getattr(os, "O_NONBLOCK", 0) | O_CLOEXEC, dir_fd=parent_fd)
    except FileNotFoundError:
        return None
    except OSError as error:
        if error.errno == errno.ELOOP:
            fail("symlink", "symbolic links are not followed in candidate paths")
        if error.errno == errno.ENOENT:
            return None
        if error.errno in (errno.EISDIR, errno.ENXIO):
            fail("not_file", "candidate target is not a regular file")
        raise classify_os_error(error) from None
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode):
            fail("not_file", "candidate target is not a regular file")
        if str(before.st_dev) != str(root_device) or mount_identity(fd) != root_mount:
            fail("nested_filesystem", "candidate target is on another mounted filesystem")
        if before.st_size > MAX_WRITE_BYTES:
            fail("target_too_large", "candidate target exceeds the write comparison limit")
        digest = hashlib.sha256()
        total = 0
        while total <= MAX_WRITE_BYTES:
            chunk = os.read(fd, min(64 * 1024, MAX_WRITE_BYTES + 1 - total))
            if not chunk:
                break
            digest.update(chunk)
            total += len(chunk)
        if total > MAX_WRITE_BYTES:
            fail("target_too_large", "candidate target exceeds the write comparison limit")
        after = os.fstat(fd)
        named = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (identity(before) != identity(after) or identity(after) != identity(named)
                or before.st_size != after.st_size or before.st_mtime_ns != after.st_mtime_ns
                or before.st_ctime_ns != after.st_ctime_ns):
            fail("target_changed", "candidate target changed while its expected hash was checked")
        return {
            "present": True, "sha256": digest.hexdigest(), "bytes": total,
            "device": str(after.st_dev), "inode": str(after.st_ino),
            "mode": stat.S_IMODE(after.st_mode) & 0o777,
        }
    finally:
        os.close(fd)


def inspect_target(request, root_fd, root_device, root_mount):
    parts = split_relative_path(request.get("path"))
    parent_fd = open_directory(root_fd, parts[:-1], root_device, root_mount)
    try:
        state = target_state(parent_fd, parts[-1], root_device, root_mount)
        return {"path": request["path"], "target": state or {"present": False}}
    finally:
        os.close(parent_fd)


def check_expected_state(current, expected_sha256):
    if expected_sha256 is None:
        if current is not None:
            fail("write_conflict", "candidate target already exists")
        return
    if not is_sha256(expected_sha256):
        fail("invalid_request", "expected candidate hash is invalid")
    if current is None or current["sha256"] != expected_sha256:
        fail("write_conflict", "candidate target no longer matches the approved content hash")


def is_sha256(value):
    return (isinstance(value, str) and len(value) == 64
            and all(character in HEX_SHA256 for character in value.lower()))


def write_target(request, container_fd, root_fd, staging_fd, root_mount):
    parts = split_relative_path(request.get("path"))
    data64 = request.get("dataBase64")
    if not isinstance(data64, str) or len(data64) > ((MAX_WRITE_BYTES + 2) // 3) * 4:
        fail("write_too_large", "candidate write exceeds the size limit")
    try:
        content = base64.b64decode(data64, validate=True)
    except (ValueError, base64.binascii.Error):
        fail("invalid_content", "candidate write content is invalid")
    if base64.b64encode(content).decode("ascii") != data64 or len(content) > MAX_WRITE_BYTES:
        fail("invalid_content", "candidate write content is invalid")
    if b"\x00" in content:
        fail("invalid_content", "candidate source files cannot contain NUL bytes")
    try:
        content.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        fail("invalid_content", "candidate source files must be UTF-8 text")
    actual_hash = hashlib.sha256(content).hexdigest()
    if not is_sha256(request.get("contentSha256")) or actual_hash != request["contentSha256"]:
        fail("invalid_request", "candidate content hash does not match the approved bytes")
    expected = request.get("expectedSha256")
    if expected is not None and not is_sha256(expected):
        fail("invalid_request", "expected candidate hash is invalid")

    parent_fd = open_directory(root_fd, parts[:-1], request["device"], root_mount)
    stage_name = f".repo-stage-{uuid.uuid4().hex}"
    stage_fd = None
    committed = False
    commit_attempted = False
    try:
        before = target_state(parent_fd, parts[-1], request["device"], root_mount)
        check_expected_state(before, expected)
        mode = before["mode"] if before else 0o644
        if mode not in (0o400, 0o440, 0o444, 0o600, 0o640, 0o644, 0o700, 0o750, 0o755, 0o770, 0o775, 0o777):
            fail("unsupported_mode", "candidate target has an unsupported permission mode")
        verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)
        try:
            stage_fd = os.open(
                stage_name,
                os.O_WRONLY | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC,
                0o600,
                dir_fd=staging_fd,
            )
        except OSError as error:
            raise classify_os_error(error) from None
        stage_info = os.fstat(stage_fd)
        if (not stat.S_ISREG(stage_info.st_mode) or str(stage_info.st_dev) != str(request["device"])
                or mount_identity(stage_fd) != root_mount):
            fail("nested_filesystem", "candidate staging file is outside the private candidate filesystem")
        os.fchmod(stage_fd, mode)
        view = memoryview(content)
        written = 0
        while written < len(view):
            count = os.write(stage_fd, view[written:])
            if count <= 0:
                fail("candidate_write_failed", "candidate staging write was incomplete")
            written += count
        os.fsync(stage_fd)
        staged = os.fstat(stage_fd)
        if not stat.S_ISREG(staged.st_mode) or identity(staged) != identity(stage_info):
            fail("candidate_write_failed", "candidate staging file identity changed")
        os.close(stage_fd)
        stage_fd = None

        verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)
        current = target_state(parent_fd, parts[-1], request["device"], root_mount)
        check_expected_state(current, expected)
        if before and current and (before["device"], before["inode"]) != (current["device"], current["inode"]):
            # Same bytes may have been recreated after approval. The hash
            # still matches; retain the actual observed pre-commit identity.
            before = current
        verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)

        if expected is None:
            try:
                # linkat is an atomic no-replace commit for a newly-created
                # target; unlink the Host-only staging name immediately after.
                commit_attempted = True
                os.link(stage_name, parts[-1], src_dir_fd=staging_fd, dst_dir_fd=parent_fd, follow_symlinks=False)
            except FileExistsError:
                commit_attempted = False
                fail("write_conflict", "candidate target was created before the approved write")
            except OSError as error:
                raise classify_os_error(error) from None
            committed = True
            os.unlink(stage_name, dir_fd=staging_fd)
        else:
            try:
                commit_attempted = True
                os.replace(stage_name, parts[-1], src_dir_fd=staging_fd, dst_dir_fd=parent_fd)
            except OSError as error:
                raise classify_os_error(error) from None
            committed = True

        os.fsync(parent_fd)
        os.fsync(staging_fd)
        verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)
        after = target_state(parent_fd, parts[-1], request["device"], root_mount)
        if (after is None or after["sha256"] != actual_hash or after["bytes"] != len(content)
                or (after["device"], after["inode"]) != (str(staged.st_dev), str(staged.st_ino))):
            fail("write_outcome_unknown", "candidate write landed but its final identity could not be confirmed")
        if before and (after["device"], after["inode"]) == (before["device"], before["inode"]):
            fail("write_outcome_unknown", "candidate write did not replace the prior file identity")
        return {
            "path": request["path"],
            "before": before or {"present": False},
            "after": {"present": True, "sha256": actual_hash, "bytes": len(content),
                      "device": after["device"], "inode": after["inode"], "mode": after["mode"]},
            "created": before is None,
        }
    except CandidateFsError as error:
        if (committed or commit_attempted) and error.code != "write_conflict":
            fail("write_outcome_unknown", "candidate write may have landed but final confirmation failed")
        raise
    except OSError as error:
        if committed or commit_attempted:
            fail("write_outcome_unknown", "candidate write may have landed but final confirmation failed")
        raise classify_os_error(error) from None
    finally:
        if stage_fd is not None:
            os.close(stage_fd)
        try:
            os.unlink(stage_name, dir_fd=staging_fd)
        except OSError:
            pass
        os.close(parent_fd)


def run_request(request):
    check_platform()
    if not isinstance(request, dict):
        fail("invalid_request", "candidate request is invalid")
    operation = request.get("operation")
    identity_fields = {"operation", "candidateDirectory", "containerDevice", "containerInode", "candidatePath", "device", "inode", "stagingDevice", "stagingInode"}
    if operation == "verify_container":
        if set(request) != {"operation", "candidateDirectory", "containerDevice", "containerInode"}:
            fail("invalid_request", "candidate-container verification request fields are invalid")
    elif operation == "verify":
        if set(request) != identity_fields:
            fail("invalid_request", "candidate verification request fields are invalid")
    elif operation == "inspect":
        if set(request) != identity_fields | {"path"}:
            fail("invalid_request", "candidate inspect request fields are invalid")
    elif operation == "write":
        if set(request) != identity_fields | {"path", "expectedSha256", "dataBase64", "contentSha256"}:
            fail("invalid_request", "candidate write request fields are invalid")
    else:
        fail("invalid_request", "candidate operation is invalid")
    if operation == "verify_container":
        return verify_candidate_container(request)
    container_fd, root_fd, staging_fd, root_mount = open_candidate(request)
    try:
        if operation == "verify":
            verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)
            return {"verified": True}
        if operation == "inspect":
            result = inspect_target(request, root_fd, str(os.fstat(root_fd).st_dev), root_mount)
            verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)
            return result
        return write_target(request, container_fd, root_fd, staging_fd, root_mount)
    finally:
        os.close(staging_fd)
        os.close(root_fd)
        os.close(container_fd)


def main():
    try:
        line = sys.stdin.readline(8 * 1024 * 1024 + 2)
        if not line or len(line) > 8 * 1024 * 1024 or sys.stdin.readline(1):
            fail("invalid_request", "candidate request must be one bounded JSON line")
        request = json.loads(line)
        result = run_request(request)
        response = {"ok": True, "result": result}
    except CandidateFsError as error:
        response = {"ok": False, "error": {"code": error.code, "message": str(error)}}
    except (json.JSONDecodeError, UnicodeDecodeError):
        response = {"ok": False, "error": {"code": "invalid_request", "message": "candidate request is invalid"}}
    except Exception:
        response = {"ok": False, "error": {"code": "candidate_write_failed", "message": "candidate operation failed"}}
    sys.stdout.write(json.dumps(response, ensure_ascii=True, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
